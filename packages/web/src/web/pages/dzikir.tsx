import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search, X, Copy, Check,
  Sunrise, Moon, BedDouble, BookOpen, ChevronDown, ChevronUp,
} from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { PageHeader } from "@/components/app-shell";
import { Card, Input } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

/* ─── Dzikir data ─── */
interface DzikirItem {
  id: string;
  title: string;
  arabic: string;
  translit: string;
  translation: string;
  reference: string;
  count?: string;
  note?: string;
}

interface DzikirSection {
  id: string;
  name: string;
  icon: typeof Sunrise;
  description: string;
  items: DzikirItem[];
}

const DZIKIR_SECTIONS: DzikirSection[] = [
  {
    id: "morning",
    name: "Dzikir Pagi",
    icon: Sunrise,
    description: "Dzikir dari Subuh hingga matahari terbit",
    items: [
      {
        id: "m1",
        title: "Ta'awuz",
        arabic: "أَعُوذُ بِاللَّهِ مِنَ الشَّيْطَانِ الرَّجِيمِ",
        translit: "A'udzu billahi minas syaithanir rajiim",
        translation: "Aku berlindung kepada Allah dari godaan syaitan yang terkutuk.",
        reference: "Al-Fatihah: 1",
        count: "1x",
      },
      {
        id: "m2",
        title: "Ayat Kursi",
        arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
        translit: "Allahu laa ilaaha illaa huwal hayyul qoyyum, laa ta'khudzuhuu sinatuw wa laa nauum",
        translation: "Allah, tidak ada Tuhan selain Dia, Yang Maha Hidup dan terus melanggengkan (makhluk-Nya). Tidak mengantuk dan tidak tidur.",
        reference: "QS. Al-Baqarah: 255",
        count: "1x",
        note: "Pelindung dari godaan setan hingga petang.",
      },
      {
        id: "m3",
        title: "Tiga Surat Perlindungan",
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
        translit: "Qul huwallahu ahad / Qul a'udzu birobbil falaq / Qul a'udzu birobbin naas",
        translation: "Katakanlah: Dialah Allah Yang Maha Esa. Katakanlah: Aku berlindung kepada Tuhan Yang Maha Esa. Katakanlah: Aku berlindung kepada Tuhan manusia.",
        reference: "Abu Dawud 4/323, Tirmidzi 5/465",
        count: "3x masing-masing",
        note: "Baca tiga kali di pagi hari — tidak ada yang akan membahayakanmu.",
      },
      {
        id: "m4",
        title: "Dzikir Pagi Utama",
        arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
        translit: "Ash-bahnaa wa ash-bahal mulku lillah, walhamdulillah, laa ilaha illallah wahdahu laa syarika lah",
        translation: "Kami telah memasuki pagi dan pada waktu ini seluruh kerajaan milik Allah. Segala puji bagi Allah. Tidak ada sesembahan yang berhak disembah kecuali Allah semata, tanpa sekutu.",
        reference: "Muslim 4/2088",
        count: "1x",
      },
      {
        id: "m5",
        title: "Memohon Pertolongan",
        arabic: "اللَّهُمَّ بِكَ أَصْبَحْنَا، وَبِكَ أَمْسَيْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ النُّشُورُ",
        translit: "Allahumma bika ash-bahnaa wa bika amsaynaa wa bika nahyaa wa bika namuutu wa ilaikan nusyuur",
        translation: "Ya Allah, dengan-Mu kami memasuki pagi, dengan-Mu kami memasuki petang, dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu juga kami akan dibangkitkan.",
        reference: "Tirmidzi & Abu Dawud",
        count: "1x",
      },
      {
        id: "m6",
        title: "Sayyidul Istighfar",
        arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ",
        translit: "Allahumma anta Rabbi laa ilaaha illaa anta, khalaqtanee wa ana abduka, wa ana 'alaa 'ahdika wa wa'dika mas-tata't",
        translation: "Ya Allah, Engkau adalah Tuhanku. Tidak ada sesembahan yang berhak disembah selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu, dan aku berada di atas perjanjian-Mu semampuku.",
        reference: "Bukhari 7/150",
        count: "1x",
        note: "Siapa yang membacanya dengan keyakinan di pagi hari lalu meninggal hari itu, ia akan masuk surga.",
      },
      {
        id: "m7",
        title: "Memohon Kesejahteraan",
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ فِي الدُّنْيَا وَالْآخِرَةِ",
        translit: "Allahumma innii as-alukal 'afwa wal 'aafiyah fid dunyaa wal aakhiroh",
        translation: "Ya Allah, aku memohon ampunan-Mu dan kesejahteraan-Mu di dunia dan akhirat.",
        reference: "Abu Dawud & Ibn Majah",
        count: "1x",
      },
      {
        id: "m8",
        title: "Perlindungan dari Segala Bahaya",
        arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
        translit: "Bismillaahil-ladhee laa yadurru ma'as-mihi shay'un fil-ardhi wa laa fis-samaa'i wa huwas-Samee'ul-'Aleem",
        translation: "Dengan nama Allah, yang dengan nama-Nya tidak ada sesuatu pun di bumi dan langit yang dapat membahayakan. Dia Maha Mendengar lagi Maha Mengetahui.",
        reference: "Abu Dawud, Tirmidzi, Ibn Majah",
        count: "3x",
      },
      {
        id: "m9",
        title: "Redha dengan Islam",
        arabic: "رَضِيْتُ بِاللهِ رَبًّا، وَبِالإِسْلاَمِ دِيْنًا، وَبِمُحَمَّدٍ صَلَّى اللهُ عَلَيْهِ وَسَلَّمَ نَبِيًّا",
        translit: "Rodhiitu billaahi robbaa wa bil-islaami diinaa, wa bi-muhammadin shallallaahu 'alaihi wa sallama nabiyya",
        translation: "Aku ridha dengan Allah sebagai Tuhanku, Islam sebagai agamaku, dan Muhammad shallallahu 'alaihi wa sallam sebagai nabiku.",
        reference: "Abu Dawud & Tirmidzi",
        count: "1x",
      },
      {
        id: "m10",
        title: "Memohon Ilmu yang Bermanfaat",
        arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
        translit: "Allahumma innee as'aluka 'ilman naafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan",
        translation: "Ya Allah, aku memohon kepada-Mu ilmu yang bermanfaat, rezeki yang baik, dan amal yang diterima.",
        reference: "Ibn Majah 1/264",
        count: "1x",
      },
      {
        id: "m11",
        title: "Subhanallah 100x",
        arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ",
        translit: "Subhaanallaahi wa bihamdih",
        translation: "Mahasuci Allah dan segala puji bagi-Nya.",
        reference: "Muslim",
        count: "100x",
        note: "Menghapus dosa seperti buih di laut.",
      },
      {
        id: "m12",
        title: "Tahlil",
        arabic: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        translit: "Laa ilaha illallah wahdahu laa syarika lah, lahul mulku walahul hamdu wa huwa 'ala kulli syai-in qodiir",
        translation: "Tidak ada sesembahan yang berhak disembah kecuali Allah semata, tanpa sekutu. Milik-Nya segala kerajaan, segala puji, dan Dia Maha Kuasa atas segala sesuatu.",
        reference: "An-Nasai & Bukhari/Muslim",
        count: "10x",
      },
    ],
  },
  {
    id: "evening",
    name: "Dzikir Petang",
    icon: Moon,
    description: "Dzikir dari Maghrib hingga tengah malam",
    items: [
      {
        id: "e1",
        title: "Dzikir Petang Utama",
        arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ، لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ",
        translit: "Amsaynaa wa amsal mulku lillah, walhamdulillah, laa ilaha illallah wahdahu laa syarika lah",
        translation: "Kami telah memasuki petang dan pada waktu ini seluruh kerajaan milik Allah. Segala puji bagi Allah. Tidak ada sesembahan yang berhak disembah kecuali Allah semata, tanpa sekutu.",
        reference: "Muslim 4/2088",
        count: "1x",
      },
      {
        id: "e2",
        title: "Memohon Pertolongan Petang",
        arabic: "اللَّهُمَّ بِكَ أَمْسَيْنَا، وَبِكَ أَصْبَحْنَا، وَبِكَ نَحْيَا، وَبِكَ نَمُوتُ، وَإِلَيْكَ الْمَصِيرُ",
        translit: "Allahumma bika amsaynaa wa bika ash-bahnaa wa bika nahyaa wa bika namuutu wa ilaikal mashiir",
        translation: "Ya Allah, dengan-Mu kami memasuki petang, dengan-Mu kami memasuki pagi, dengan-Mu kami hidup, dengan-Mu kami mati, dan kepada-Mu tempat kembali.",
        reference: "Tirmidzi & Abu Dawud",
        count: "1x",
      },
      {
        id: "e3",
        title: "Perlindungan dengan Kalimat Allah",
        arabic: "أَعُوذُ بِكَلِمَاتِ اللهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
        translit: "A'oodhu bikalimaatil-laahit-taammaati min sharri maa khalaq",
        translation: "Aku berlindung dengan kalimat-kalimat Allah yang sempurna dari kejahatan makhluk-Nya.",
        reference: "Muslim 4/2081",
        count: "3x",
        note: "Siapa yang mengucapkan ini di petang hari, tidak akan dibahayakan sesuatu pun di malam itu.",
      },
      {
        id: "e4",
        title: "Ayat Kursi",
        arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
        translit: "Allahu laa ilaaha illaa huwal hayyul qoyyum, laa ta'khudzuhuu sinatuw wa laa nauum",
        translation: "Allah, tidak ada Tuhan selain Dia, Yang Maha Hidup dan terus melanggengkan (makhluk-Nya). Tidak mengantuk dan tidak tidur.",
        reference: "QS. Al-Baqarah: 255",
        count: "1x",
        note: "Pelindung dari godaan setan semalam.",
      },
      {
        id: "e5",
        title: "Sayyidul Istighfar",
        arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ",
        translit: "Allahumma anta Rabbi laa ilaaha illaa anta, khalaqtanee wa ana abduka, wa ana 'alaa 'ahdika wa wa'dika mas-tata't",
        translation: "Ya Allah, Engkau adalah Tuhanku. Tidak ada sesembahan yang berhak disembah selain Engkau. Engkau menciptakanku dan aku adalah hamba-Mu.",
        reference: "Bukhari 7/150",
        count: "1x",
        note: "Siapa yang membacanya dengan keyakinan di petang hari lalu meninggal malam itu, ia akan masuk surga.",
      },
      {
        id: "e6",
        title: "Tiga Surat Perlindungan",
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ﴿١﴾ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿١﴾ قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
        translit: "Qul huwallahu ahad / Qul a'udzu birobbil falaq / Qul a'udzu birobbin naas",
        translation: "Katakanlah: Dialah Allah Yang Maha Esa. Katakanlah: Aku berlindung kepada Tuhan Yang Maha Esa. Katakanlah: Aku berlindung kepada Tuhan manusia.",
        reference: "Abu Dawud 4/323, Tirmidzi 5/465",
        count: "3x masing-masing",
        note: "Baca tiga kali di petang hari.",
      },
      {
        id: "e7",
        title: "Subhanallah 100x",
        arabic: "سُبْحَانَ اللهِ وَبِحَمْدِهِ",
        translit: "Subhaanallaahi wa bihamdih",
        translation: "Mahasuci Allah dan segala puji bagi-Nya.",
        reference: "Muslim",
        count: "100x",
        note: "Menghapus dosa seperti buih di laut.",
      },
      {
        id: "e8",
        title: "Tahlil",
        arabic: "لَا إِلَهَ إِلَّا اللهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ",
        translit: "Laa ilaha illallah wahdahu laa syarika lah, lahul mulku walahul hamdu wa huwa 'ala kulli syai-in qodiir",
        translation: "Tidak ada sesembahan yang berhak disembah kecuali Allah semata, tanpa sekutu. Milik-Nya segala kerajaan, segala puji, dan Dia Maha Kuasa atas segala sesuatu.",
        reference: "An-Nasai & Bukhari/Muslim",
        count: "10x",
      },
    ],
  },
  {
    id: "before-sleep",
    name: "Dzikir Sebelum Tidur",
    icon: BedDouble,
    description: "Dzikir saat hendak beristirahat",
    items: [
      {
        id: "s1",
        title: "Baca Tiga Surat Perlindungan",
        arabic: "قُلْ هُوَ اللَّهُ أَحَدٌ ﴿٣﴾ قُلْ أَعُوذُ بِرَبِّ الْفَلَقِ ﴿٣﴾ قُلْ أَعُوذُ بِرَبِّ النَّاسِ",
        translit: "Qul huwallahu ahad / Qul a'udzu birobbil falaq / Qul a'udzu birobbin naas",
        translation: "Baca tiga surat Al-Ikhlas, Al-Falaq, dan An-Nas — tiup ke kedua tangan, lalu usap seluruh tubuh yang terjangkau.",
        reference: "Bukhari & Muslim",
        count: "3x tiup",
        note: "Dibaca ke telapak tangan, ditiup, lalu diusapkan ke seluruh tubuh.",
      },
      {
        id: "s2",
        title: "Ayat Kursi",
        arabic: "اللَّهُ لَا إِلَٰهَ إِلَّا هُوَ الْحَيُّ الْقَيُّومُ ۚ لَا تَأْخُذُهُ سِنَةٌ وَلَا نَوْمٌ",
        translit: "Allahu laa ilaaha illaa huwal hayyul qoyyum, laa ta'khudzuhuu sinatuw wa laa nauum",
        translation: "Allah, tidak ada Tuhan selain Dia, Yang Maha Hidup dan terus melanggengkan (makhluk-Nya). Tidak mengantuk dan tidak tidur.",
        reference: "Bukhari",
        count: "1x",
        note: "Pelindung dari godaan setan semalam.",
      },
      {
        id: "s3",
        title: "Dua Sebelum Tidur",
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        translit: "Bismika Allahumma amootu wa ahya",
        translation: "Dengan nama-Mu ya Allah, aku mati dan aku hidup.",
        reference: "Bukhari 11/113",
        count: "1x",
      },
      {
        id: "s4",
        title: "Istighfar Sebelum Tidur",
        arabic: "اللَّهُمَّ إِنِّي أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
        translit: "Allahumma innee astaghfiruka wa atoobu ilayk",
        translation: "Ya Allah, aku memohon ampunan-Mu dan bertobat kepada-Mu.",
        reference: "Bukhari 11/101",
        count: "1x",
      },
      {
        id: "s5",
        title: "Dzikir Sebelum Tidur",
        arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
        translit: "Subhaanallaahi wa bihamdih",
        translation: "Mahasuci Allah dan segala puji bagi-Nya.",
        reference: "Bukhari 7/168",
        count: "100x",
        note: "Membaca ini 100 kali sebelum tidur menghapus dosa seperti buih di laut.",
      },
      {
        id: "s6",
        title: "Tidur dalam Keadaan Suci",
        arabic: "اللَّهُمَّ قِنِي عَذَابَكَ يَوْمَ تَبْعَثُ عِبَادَكَ",
        translit: "Allahumma qinii 'adzaabak, yawma tab'atsu 'ibaadak",
        translation: "Ya Allah, lindungilah aku dari siksa-Mu pada hari Engkau membangkitkan hamba-hamba-Mu.",
        reference: "Tirmidzi & Abu Dawud",
        count: "1x",
        note: "Dibaca saat berbaring di sisi kanan.",
      },
      {
        id: "s7",
        title: "Memohon Kesejahteraan dan Pengampunan",
        arabic: "اللَّهُمَّ إِنَّكَ خَلَقْتَ نَفْسِي وَأَنْتَ تَوَفَّاهَا، لَكَ مَمَاتُهَا وَمَحْيَاهَا، إِنْ أَحْيَيْتَهَا فَاحْفَظْهَا، وَإِنْ أَمَتَّهَا فَاغْفِرْ لَهَا",
        translit: "Allahumma innaka kholaqta nafsii wa anta tawaffaahaa, laka mamaatuhaa wa mahyaahaa, in ahyaitaha fahfadhhaa, wa in amatthaha faghfir lahaa",
        translation: "Ya Allah, Engkau menciptakan diriku dan Engkau yang mewafatkannya. Milik-Mu kematian dan kehidupannya. Jika Engkau hidupkan diriku, jagalah diriku, dan jika Engkau wafatkan, ampunilah diriku.",
        reference: "Muslim",
        count: "1x",
      },
      {
        id: "s8",
        title: "Bismika Allahumma Amuutu wa Ahyaa",
        arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
        translit: "Bismika Allahumma amuutu wa ahyaa",
        translation: "Dengan nama-Mu ya Allah, aku mati dan aku hidup.",
        reference: "Bukhari",
        count: "1x",
      },
      {
        id: "s9",
        title: "Tasbih Fatimah",
        arabic: "سُبْحَانَ اللَّهِ (33x) • الْحَمْدُ لِلَّهِ (33x) • اللَّهُ أَكْبَرُ (34x)",
        translit: "Subhaanallah (33x) • Alhamdulillah (33x) • Allahu Akbar (34x)",
        translation: "Mahasuci Allah (33x), Segala puji bagi Allah (33x), Allah Maha Besar (34x).",
        reference: "Bukhari & Muslim",
        count: "Total 100x",
        note: "Lebih baik daripada memiliki pembantu.",
      },
      {
        id: "s10",
        title: "Doa Memohon Pengampunan Utang",
        arabic: "اللَّهُمَّ رَبَّ السَّمَاوَاتِ السَّبْعِ وَرَبَّ الْعَرْشِ الْعَظِيمِ، اقْضِ عَنَّا الدَّيْنَ وَأَغْنِنَا مِنَ الْفَقْرِ",
        translit: "Allahumma robbas-samaawaatis sab'i wa robbal 'arsyil 'azhiim, iqdhi 'annad-dainaa wa aghninaa minal faqri",
        translation: "Ya Allah, Tuhan yang menguasai tujuh langit dan yang menguasai Arsy yang agung, lunasilah utang kami dan berikanlah kami kekayaan.",
        reference: "Muslim",
        count: "1x",
      },
    ],
  },
];

/* ─── Main component ─── */
export default function Dzikir() {
  const { t } = useI18n();
  const [activeSection, setActiveSection] = useState<string>("morning");
  const [q, setQ] = useState("");
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [copied, setCopied] = useState<string | null>(null);

  const sections = DZIKIR_SECTIONS;

  const filteredItems = useMemo(() => {
    const section = sections.find((s) => s.id === activeSection);
    if (!section) return [];
    const query = q.trim().toLowerCase();
    if (!query) return section.items;
    return section.items.filter(
      (item) =>
        item.title.toLowerCase().includes(query) ||
        item.arabic.includes(query) ||
        item.translation.toLowerCase().includes(query) ||
        item.translit.toLowerCase().includes(query)
    );
  }, [activeSection, q, sections]);

  const toggleExpand = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const copyDzikir = (item: DzikirItem) => {
    const text = `${item.arabic}\n\n${item.translit}\n\n${item.translation}\n\n— ${item.reference}`;
    navigator.clipboard.writeText(text);
    setCopied(item.id);
    setTimeout(() => setCopied(null), 2000);
  };

  const activeSectionData = sections.find((s) => s.id === activeSection);
  const ActiveIcon = activeSectionData?.icon ?? Sunrise;

  return (
    <div>
      <PageHeader
        title={t("dzikir.title")}
        subtitle={t("dzikir.subtitle")}
        icon={<BookOpen className="h-5 w-5" />}
      />

      {/* Section tabs */}
      <div className="flex flex-wrap gap-2 mb-5">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <button
              key={section.id}
              onClick={() => { setActiveSection(section.id); setQ(""); }}
              className={cn(
                "flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-all",
                activeSection === section.id
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border hover:bg-muted"
              )}
            >
              <Icon className="h-4 w-4" />
              {section.name}
            </button>
          );
        })}
      </div>

      {/* Search */}
      <div className="relative mb-5 max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder={t("dzikir.search")}
          className="pl-9"
        />
      </div>

      {/* Description */}
      {activeSectionData && (
        <p className="text-sm text-muted-foreground mb-4">
          {activeSectionData.description}
        </p>
      )}

      {/* Dzikir cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <AnimatePresence mode="popLayout">
          {filteredItems.map((item, i) => {
            const isExpanded = expanded.has(item.id);
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.3, delay: Math.min(i * 0.03, 0.3) }}
                className="rounded-2xl border border-border/70 bg-card shadow-soft overflow-hidden"
              >
                {/* Header */}
                <button
                  onClick={() => toggleExpand(item.id)}
                  className="w-full text-left p-5 pb-3 hover:bg-muted/30 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <ActiveIcon className="h-4 w-4" />
                    </span>
                    <div className="flex items-center gap-2">
                      {item.count && (
                        <span className="text-[10px] font-medium bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {item.count}
                        </span>
                      )}
                      {isExpanded ? (
                        <ChevronUp className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </div>
                  </div>
                  <p className="text-arabic text-xl text-primary text-right leading-loose mb-3 line-clamp-2 break-words" dir="rtl" style={{ overflowWrap: 'anywhere' }}>
                    {item.arabic}
                  </p>
                  <p className="text-sm font-medium mb-1">{item.title}</p>
                  {!isExpanded && (
                    <p className="text-xs text-muted-foreground line-clamp-2 break-words">{item.translation}</p>
                  )}
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3">
                        {/* Transliterasi */}
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Transliterasi</p>
                          <p className="text-sm italic text-foreground/90 leading-relaxed">{item.translit}</p>
                        </div>
                        {/* Terjemahan */}
                        <div>
                          <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">Terjemahan</p>
                          <p className="text-sm leading-relaxed">{item.translation}</p>
                        </div>
                        {/* Reference + Copy */}
                        <div className="flex items-center justify-between gap-2 pt-3 border-t border-border/60">
                          <span className="text-xs text-muted-foreground italic">— {item.reference}</span>
                          <button
                            onClick={() => copyDzikir(item)}
                            className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
                          >
                            {copied === item.id ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
                            {copied === item.id ? "Tersalin" : "Salin"}
                          </button>
                        </div>
                        {/* Note */}
                        {item.note ? (
                          <div className="rounded-xl bg-amber-500/10 border border-amber-500/20 p-3">
                            <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                              <span className="font-semibold">Keutamaan: </span>{item.note}
                            </p>
                          </div>
                        ) : null}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredItems.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-display text-lg font-medium">{t("duas.empty")}</p>
          <p className="text-sm text-muted-foreground mt-1">Coba pencarian atau bagian lain.</p>
        </div>
      ) : null}
    </div>
  );
}
