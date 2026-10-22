import { ArrowLeft, ArrowRight, BadgeCheck, Bell, Calculator, CalendarDays, ChartColumn, CircleCheck, Coins, Copy, Crown, Download, Flame, Gift, Hand, History, House, IndianRupee, Key, KeyRound, Landmark, Lock, LogOut, MapPin, Package, Pencil, Plus, QrCode, Receipt, RefreshCw, Save, Search, Send, Settings, ShieldCheck, ShoppingCart, Smartphone, SmartphoneNfc, Tag, TrendingUp, TriangleAlert, User, UserPen, Wallet, X, Zap, type LucideIcon } from "lucide-react";
const ICON_BASE = "https://reversebypass.store/icons/new/";
// Animated stickers (Lottie) used across the app.
// One module so every sticker stays matched to the thing it labels.

export const STICKERS = {
  // navigation + page headers
  home: `${ICON_BASE}shop-store.json`,
  wallet: `${ICON_BASE}wallet-lottie.json`,
  orders: `${ICON_BASE}my-orders.json`,
  leaders: `${ICON_BASE}crown.json`,
  profile: `${ICON_BASE}profile-lottie.json`,
  // home page
  search: `${ICON_BASE}search-emoji.json`,
  video: `${ICON_BASE}gift-code.json`,
  // wallet / add funds
  addFunds: `${ICON_BASE}add-funds-plus.json`,
  balance: `${ICON_BASE}balance-emoji.json`,
  rupee: `${ICON_BASE}rupee-emoji.json`,
  bank: `${ICON_BASE}bank-emoji.json`,
  qrHint: `${ICON_BASE}qr-hint-emoji.json`,
  chooseAmount: `${ICON_BASE}choose-amount-emoji.json`,
  minDeposit: `${ICON_BASE}min-deposit-emoji.json`,
  customAmount: `${ICON_BASE}custom-amount-emoji.json`,
  send: `${ICON_BASE}send-emoji.json`,
  copy: `${ICON_BASE}otp-clipboard.json`,
  // orders / history
  track: `${ICON_BASE}track-emoji.json`,
  download: `${ICON_BASE}download-emoji.json`,
  refresh: `${ICON_BASE}refresh-emoji.json`,
  history: `${ICON_BASE}history-emoji.json`,
  historyTitle: `${ICON_BASE}history-title-emoji.json`,
  // profile
  editProfile: `${ICON_BASE}edit-profile.json`,
  editTitle: `${ICON_BASE}edit-title-emoji.json`,
  save: `${ICON_BASE}save-emoji.json`,
  logout: `${ICON_BASE}logout-flash.json`,
  lock: `${ICON_BASE}lock-emoji.json`,
  telegram: `${ICON_BASE}telegram-lottie.json`,
  // login
  welcome: `${ICON_BASE}welcome-emoji.json`,
  welcomeYoda: `${ICON_BASE}welcome-yoda.json`,
  flame: `${ICON_BASE}signin-flame.json`,
  google: `${ICON_BASE}google-lottie.json`,
  shield: `${ICON_BASE}shield-verify.json`,
  proceed: `${ICON_BASE}proceed-emoji.json`,
  // shared bits
  verified: `${ICON_BASE}verified-check.json`,
  verifiedBadge: `${ICON_BASE}verified-badge.json`,
  close: `${ICON_BASE}close-emoji.json`,
  back: `${ICON_BASE}back-arrow-emoji.json`,
  bell: `${ICON_BASE}bell.json`,
  cart: `${ICON_BASE}shopping-cart.json`,
  today: `${ICON_BASE}today-emoji.json`,
  todaySales: `${ICON_BASE}today-sales.json`,
  monthlySales: `${ICON_BASE}monthly-sales.json`,
  key: `${ICON_BASE}key-lottie.json`,
  activeKeys: `${ICON_BASE}active-keys.json`,
  apiSettings: `${ICON_BASE}api-settings.json`,
  phone: `${ICON_BASE}phone-spidey.json`,
  phoneArrow: `${ICON_BASE}phone-arrow.json`,
  sendFlash: `${ICON_BASE}send-flash.json`,
} as const;

export type StickerName = keyof typeof STICKERS;

export function stickerUrl(name: StickerName) {
  return STICKERS[name];
}

// Plain icon stand-ins shown instead of the animated stickers on low devices.
export const STICKER_ICON: Record<StickerName, LucideIcon> = {
  home: House,
  wallet: Wallet,
  orders: Package,
  leaders: Crown,
  profile: User,
  search: Search,
  video: Gift,
  addFunds: Plus,
  balance: Coins,
  rupee: IndianRupee,
  bank: Landmark,
  qrHint: QrCode,
  chooseAmount: Calculator,
  minDeposit: TriangleAlert,
  customAmount: Pencil,
  send: Send,
  copy: Copy,
  track: MapPin,
  download: Download,
  refresh: RefreshCw,
  history: History,
  historyTitle: Receipt,
  editProfile: UserPen,
  editTitle: Tag,
  save: Save,
  logout: LogOut,
  lock: Lock,
  telegram: Send,
  welcome: Hand,
  welcomeYoda: Hand,
  flame: Flame,
  google: KeyRound,
  shield: ShieldCheck,
  proceed: ArrowRight,
  verified: CircleCheck,
  verifiedBadge: BadgeCheck,
  close: X,
  back: ArrowLeft,
  bell: Bell,
  cart: ShoppingCart,
  today: CalendarDays,
  todaySales: TrendingUp,
  monthlySales: ChartColumn,
  key: Key,
  activeKeys: KeyRound,
  apiSettings: Settings,
  phone: Smartphone,
  phoneArrow: SmartphoneNfc,
  sendFlash: Zap,
};

const iconByUrl = new Map<string, LucideIcon>(
  (Object.keys(STICKERS) as StickerName[]).map((name) => [STICKERS[name], STICKER_ICON[name]]),
);

/** Plain icon for a sticker URL, or undefined when the src is not a known sticker. */
export function stickerIconFor(src: string): LucideIcon | undefined {
  return iconByUrl.get(src);
}
