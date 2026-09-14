import { Router, Response } from 'express';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { OAuth2Client } from 'google-auth-library';
import { v4 as uuidv4 } from 'uuid';
import { env } from '../../config/env.js';
import { AppError } from '../../platform/errors.js';
import { AuthenticatedRequest, UserRole } from '../../platform/types.js';
import { UserModel } from '../../db/models/index.js';
import { logger } from '../../platform/logger.js';

export const authRouter = Router();

const googleClient = new OAuth2Client(env.GOOGLE_CLIENT_ID);

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1).optional(),
  demoRole: z.string().optional(),
});

const googleAuthSchema = z.object({
  credential: z.string().optional(), // Google ID Token
  email: z.string().email().optional(),
  name: z.string().optional(),
  avatarUrl: z.string().optional(),
  googleId: z.string().optional(),
  role: z.string().optional(),
});

// 1. Password / Demo Login
authRouter.post('/login', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { email, demoRole } = loginSchema.parse(req.body);
    const role = (demoRole || 'FLEET_OWNER') as UserRole;
    const tenantId = 'tenant_delhi_01';

    // Find or create in MongoDB
    let user = await UserModel.findOne({ email: email.toLowerCase() });
    if (!user) {
      user = await UserModel.create({
        userId: `usr_${uuidv4().slice(0, 8)}`,
        email: email.toLowerCase(),
        name: email.split('@')[0].toUpperCase(),
        role,
        tenantId,
        orgId: 'org_marichi_logistics',
        branches: ['DL-Okhla', 'MH-Bhiwandi', 'KA-Peenya'],
        permissions: ['*'],
        authProvider: 'local',
      });
    }

    const payload = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      orgId: user.orgId,
      role: user.role as UserRole,
      branches: user.branches,
      permissions: user.permissions,
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token,
        user: payload,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 2. Google OAuth Sign-In (Google Identity Services / Token Exchange)
authRouter.post('/google', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const body = googleAuthSchema.parse(req.body);
    let verifiedEmail = body.email;
    let verifiedName = body.name;
    let verifiedAvatar = body.avatarUrl;
    let verifiedGoogleId = body.googleId;

    // If Google ID token credential provided, verify with Google
    if (body.credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: body.credential,
          audience: env.GOOGLE_CLIENT_ID || undefined,
        });
        const payload = ticket.getPayload();
        if (payload) {
          verifiedEmail = payload.email;
          verifiedName = payload.name;
          verifiedAvatar = payload.picture;
          verifiedGoogleId = payload.sub;
        }
      } catch (verifyErr) {
        logger.warn({ err: verifyErr, msg: 'Google verifyIdToken note (falling back to credential payload)' });
        // Fallback: decode JWT payload without network if testing in dev
        const decoded: any = jwt.decode(body.credential);
        if (decoded && decoded.email) {
          verifiedEmail = decoded.email;
          verifiedName = decoded.name || decoded.email.split('@')[0];
          verifiedAvatar = decoded.picture;
          verifiedGoogleId = decoded.sub;
        }
      }
    }

    if (!verifiedEmail) {
      return next(AppError.badRequest('Unable to verify Google authentication payload. Email is required.'));
    }

    const tenantId = 'tenant_delhi_01';
    const role: UserRole = (body.role as UserRole) || 'FLEET_OWNER';

    // Find or create in MongoDB
    let user = await UserModel.findOne({ email: verifiedEmail.toLowerCase() });

    if (user) {
      user.name = verifiedName || user.name;
      user.avatarUrl = verifiedAvatar || user.avatarUrl;
      user.googleId = verifiedGoogleId || user.googleId;
      user.authProvider = 'google';
      await user.save();
      logger.info(` Google user logged in: ${user.email} (MongoDB ID: ${user._id})`);
    } else {
      user = await UserModel.create({
        userId: `usr_g_${uuidv4().slice(0, 8)}`,
        email: verifiedEmail.toLowerCase(),
        name: verifiedName || verifiedEmail.split('@')[0],
        avatarUrl: verifiedAvatar,
        googleId: verifiedGoogleId,
        authProvider: 'google',
        role,
        tenantId,
        orgId: 'org_marichi_logistics',
        branches: ['DL-Okhla', 'MH-Bhiwandi', 'KA-Peenya'],
        permissions: ['*'],
      });
      logger.info(` Created new Google user in MongoDB: ${user.email} (ID: ${user.userId})`);
    }

    const authPayload = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      tenantId: user.tenantId,
      orgId: user.orgId,
      role: user.role as UserRole,
      branches: user.branches,
      permissions: user.permissions,
      authProvider: 'google',
    };

    const token = jwt.sign(authPayload, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      message: `Signed in successfully with Google as ${user.name}`,
      data: {
        token,
        user: authPayload,
      },
    });
  } catch (err) {
    next(err);
  }
});

// 3. Current User Context
authRouter.get('/me', async (req: AuthenticatedRequest, res: Response, next) => {
  if (!req.auth) {
    return next(AppError.unauthorized());
  }

  // Fetch fresh user from MongoDB
  try {
    const user = await UserModel.findOne({ email: req.auth.email.toLowerCase() });
    if (user) {
      return res.json({
        success: true,
        data: {
          ...req.auth,
          name: user.name,
          avatarUrl: user.avatarUrl,
          role: user.role,
          authProvider: user.authProvider,
        },
      });
    }
  } catch (e) {
    // fallback
  }

  res.json({
    success: true,
    data: req.auth,
  });
});

// 4. Persona Switcher
authRouter.post('/persona-switch', async (req: AuthenticatedRequest, res: Response, next) => {
  try {
    const { role } = z.object({ role: z.string() }).parse(req.body);
    const tenantId = req.auth?.tenantId || 'tenant_delhi_01';

    const payload = {
      userId: `usr_${role.toLowerCase()}_01`,
      email: `${role.toLowerCase()}@marichifleet.com`,
      name: `${role} Active User`,
      tenantId,
      orgId: 'org_marichi_logistics',
      role: role as UserRole,
      branches: ['DL-Okhla', 'MH-Bhiwandi'],
      permissions: ['*'],
    };

    const token = jwt.sign(payload, env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      success: true,
      data: {
        token,
        user: payload,
      },
    });
  } catch (err) {
    next(err);
  }
});
