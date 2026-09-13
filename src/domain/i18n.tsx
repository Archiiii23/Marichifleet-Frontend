import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "hi";

const DICT: Record<Language, Record<string, string>> = {
  en: {
    "driver.home": "Home",
    "driver.trips": "Trips",
    "driver.inbox": "Inbox",
    "driver.fuel": "Fuel",
    "driver.report": "Report Issue",
    "driver.pay": "Pay & Slips",
    "driver.greeting": "Good day",
    "driver.vehicle": "Your Assigned Vehicle",
    "driver.regNo": "Registration",
    "driver.fuelPct": "Fuel Level",
    "driver.odometer": "Odometer",
    "driver.status": "Vehicle Status",
    "driver.accept": "Accept Trip",
    "driver.start": "Start Trip",
    "driver.delivered": "Mark Delivered",
    "driver.pod": "Proof of Delivery (e-POD)",
    "driver.receiver": "Receiver Name",
    "driver.otp": "Delivery OTP",
    "driver.submitPod": "Submit POD",
    "driver.offline": "You are offline. Updates are safely stored on device and sync when signal returns.",
    "driver.synced": "All work synced",
    "driver.queued": "queued",
    "driver.checkpoints": "Corridor Checkpoints",
    "driver.done": "Done",
    "driver.activeTrips": "active trip assignments",
    "driver.noTrips": "No active assignments right now",
    "driver.signature": "Tap to capture receiver signature",
    "driver.signed": "Signature captured",
    "driver.tapToCall": "Tap to Call Dispatch",
  },
  hi: {
    "driver.home": "होम",
    "driver.trips": "ट्रिप्स",
    "driver.inbox": "संदेश",
    "driver.fuel": "डीजल",
    "driver.report": "समस्या दर्ज करें",
    "driver.pay": "वेतन पर्ची",
    "driver.greeting": "नमस्ते",
    "driver.vehicle": "आपकी गाड़ी",
    "driver.regNo": "गाड़ी नंबर",
    "driver.fuelPct": "डीजल स्तर",
    "driver.odometer": "किलोमीटर",
    "driver.status": "गाड़ी स्थिति",
    "driver.accept": "ट्रिप स्वीकारें",
    "driver.start": "ट्रिप शुरू करें",
    "driver.delivered": "डिलीवर हो गया",
    "driver.pod": "डिलीवरी रसीद (e-POD)",
    "driver.receiver": "सामान लेने वाले का नाम",
    "driver.otp": "डिलीवरी OTP",
    "driver.submitPod": "POD जमा करें",
    "driver.offline": "आप ऑफलाइन हैं। नेटवर्क आते ही अपडेट्स अपने आप सिंक हो जाएंगे।",
    "driver.synced": "सब काम सिंक है",
    "driver.queued": "कतार में",
    "driver.checkpoints": "रास्ते के चेकपॉइंट्स",
    "driver.done": "हो गया",
    "driver.activeTrips": "चालू ट्रिप्स",
    "driver.noTrips": "अभी कोई नई ट्रिप नहीं है",
    "driver.signature": "हस्ताक्षर लेने के लिए टैप करें",
    "driver.signed": "हस्ताक्षर ले लिया गया",
    "driver.tapToCall": "डिस्पैच को फोन लगाएं",
  },
};

interface I18nContextValue {
  lang: Language;
  setLang: (l: Language) => void;
  t: (key: string, fallback?: string) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);
const STORAGE_KEY = "marichifleet.driver.lang";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
    if (saved === "en" || saved === "hi") {
      setLangState(saved);
    }
  }, []);

  const setLang = (l: Language) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
  };

  const t = (key: string, fallback?: string): string => {
    return DICT[lang]?.[key] ?? DICT.en[key] ?? fallback ?? key;
  };

  return (
    <I18nContext.Provider value={{ lang, setLang, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    // Graceful fallback if used outside provider
    return {
      lang: "en" as Language,
      setLang: () => {},
      t: (key: string, fallback?: string) => DICT.en[key] ?? fallback ?? key,
    };
  }
  return ctx;
}
