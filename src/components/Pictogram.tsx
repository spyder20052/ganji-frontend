import {
  Activity, AlertTriangle, Baby, BadgeCheck, Bandage, Bed, Brain, CalendarDays, Droplet, Droplets, Ear, FileText, Flame, Frown,
  HandHeart, HeartPulse, Home, Hospital, MapPin, MessageCircle, Phone, Pill, QrCode, Siren, Stethoscope, Syringe, Thermometer,
  User, Users, Wind, Zap, type LucideIcon, Eye, Accessibility, Heart, ShieldCheck, Waves, Milk, CircleHelp, Footprints,
  Bone, Bug, CupSoda, HeartCrack, LifeBuoy, MessagesSquare, Sun, FlaskConical, Cross, WifiOff, UserX,
} from 'lucide-react';

/** Pictogrammes testés : un sens par icône (goutte = sang, pilule = médicament, carnet = dossier, téléphone = appeler). */
const MAP: Record<string, LucideIcon> = {
  blood: Droplet, sang: Droplet, drop: Droplet,
  pill: Pill, medication: Pill, pharmacy: Pill,
  carnet: FileText, record: FileText, document: FileText,
  phone: Phone, call: Phone,
  emergency: Siren, urgence: Siren, sos: Siren, warning: AlertTriangle,
  qr: QrCode, map: MapPin, place: MapPin, hospital: Hospital, home: Home,
  fever: Thermometer, thermometer: Thermometer, pain: Zap, headache: Brain, bleeding: Droplets, fatigue: Bed, vomiting: Waves,
  breath: Wind, cough: Wind, bruise: Bandage, injury: Bandage, convulsion: Activity, lethargy: Bed, 'no-drink': Milk,
  child: Baby, baby: Baby, pregnant: Heart, adult: User, elderly: Footprints, people: Users,
  stethoscope: Stethoscope, heart: HeartPulse, vaccine: Syringe, calendar: CalendarDays, mind: Brain, sad: Frown,
  listen: Ear, chat: MessageCircle, care: HandHeart, check: BadgeCheck, shield: ShieldCheck, eye: Eye, a11y: Accessibility,
  breathing: Wind, urine: FlaskConical, 'stiff-neck': Activity, ors: CupSoda, stroke: Brain, burn: Flame, crisis: LifeBuoy,
  bandage: Bandage, bite: Bug, 'blood-cough': Droplets, 'blood-stool': Droplets, 'blood-vomit': Droplets, 'chest-pain': HeartCrack,
  dehydration: CupSoda, fracture: Bone, jaundice: Sun, nose: Wind, question: CircleHelp, 'sickle-cell': Cross, talk: MessagesSquare,
  offline: WifiOff, 'no-account': UserX,
  swelling: Flame, 'no-movement': Baby, 'water-loss': Droplets, 'abdominal-pain': Zap, diarrhea: Waves, other: CircleHelp,
};

export function Pictogram({ name, size = 28, className }: { name: string; size?: number; className?: string }) {
  const Icon = MAP[name] ?? CircleHelp;
  return <Icon aria-hidden="true" size={size} strokeWidth={2} className={className} />;
}
