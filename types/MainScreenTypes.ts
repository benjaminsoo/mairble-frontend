export interface DayData {
  date: string;
  originalDate: string;
  day: string;
  currentPrice: number;
  marketPrice: number;
  suggestedPrice: number;
  aiInsight: string;
  boost: string;
}

export interface AppData {
  propertyName: string;
  location: string;
  currentPrice: number;
  marketPrice: number;
  suggestedPrice: number;
  priceChange: string;
  totalIncrease: string;
  nextFiveDays: DayData[];
}

export interface CustomTimeWindowData {
  days: DayData[];
  startDate: string | null; // Store as YYYY-MM-DD string
  endDate: string | null;   // Store as YYYY-MM-DD string
  isLoading: boolean;
  showCalendar: boolean;
}

export interface MainScreenState {
  expandedDays: number[];
  appData: AppData | null;
  loading: boolean;
  error: string | null;
  showSplash: boolean;
  updatingDays: Set<number>;
  customPrices: { [key: string]: string };
  customWindow: CustomTimeWindowData;
  expandedCustomDays: number[];
  showCustomWindow: boolean;
} 