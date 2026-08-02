/**
 * Curated Dua library — authentic supplications organized by occasion.
 * Arabic + transliteration + translation + reference.
 */

export interface Dua {
  id: string;
  category: string;
  title: string;
  arabic: string;
  translit: string;
  translation: string;
  reference: string;
  note?: string;
}

export interface DuaCategory {
  id: string;
  name: string;
  arabicName: string;
  description: string;
  icon: string;
}

export const DUA_CATEGORIES: DuaCategory[] = [
  { id: "morning-evening", name: "Morning & Evening", arabicName: "أذكار الصباح والمساء", description: "Protection and remembrance for start and end of day", icon: "Sunrise" },
  { id: "after-prayer", name: "After Prayer", arabicName: "أذكار بعد الصلاة", description: "Sunnah supplications after salah", icon: "Sparkles" },
  { id: "before-sleep", name: "Before Sleep", arabicName: "أذكار النوم", description: "Remembrance before resting", icon: "Moon" },
  { id: "eating", name: "Eating & Drinking", arabicName: "أدعية الطعام", description: "Gratitude and blessings for sustenance", icon: "Utensils" },
  { id: "travel", name: "Travel", arabicName: "دعاء السفر", description: "Supplications for the journey", icon: "Plane" },
  { id: "distress", name: "Distress & Anxiety", arabicName: "دعاء الكرب", description: "Finding calm in difficulty", icon: "Heart" },
  { id: "forgiveness", name: "Seeking Forgiveness", arabicName: "الاستغفار", description: "Turning back to Allah", icon: "RefreshCw" },
  { id: "gratitude", name: "Gratitude", arabicName: "الشكر", description: "Thanking Allah for His favors", icon: "HandHeart" },
  { id: "protection", name: "Protection", arabicName: "الحماية", description: "Seeking refuge in Allah", icon: "Shield" },
  { id: "knowledge", name: "Knowledge & Wisdom", arabicName: "العلم والحكمة", description: "Seeking understanding", icon: "BookOpen" },
];

export const DUAS: Dua[] = [
  /* Morning & Evening */
  {
    id: "d1",
    category: "morning-evening",
    title: "Morning Remembrance",
    arabic: "أَصْبَحْنَا وَأَصْبَحَ الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ",
    translit: "Asbahnaa wa asbahal-mulku lillaah, walhamdu lillaah",
    translation: "We have reached the morning and at this very time the whole kingdom belongs to Allah. Praise is to Allah.",
    reference: "Muslim 4/2088",
  },
  {
    id: "d2",
    category: "morning-evening",
    title: "Evening Remembrance",
    arabic: "أَمْسَيْنَا وَأَمْسَى الْمُلْكُ لِلَّهِ، وَالْحَمْدُ لِلَّهِ",
    translit: "Amsaynaa wa amsal-mulku lillaah, walhamdu lillaah",
    translation: "We have reached the evening and at this very time the whole kingdom belongs to Allah. Praise is to Allah.",
    reference: "Muslim 4/2088",
  },
  {
    id: "d3",
    category: "morning-evening",
    title: "Sayyid al-Istighfar (Master of Seeking Forgiveness)",
    arabic: "اللَّهُمَّ أَنْتَ رَبِّي لَا إِلَهَ إِلَّا أَنْتَ، خَلَقْتَنِي وَأَنَا عَبْدُكَ، وَأَنَا عَلَى عَهْدِكَ وَوَعْدِكَ مَا اسْتَطَعْتُ",
    translit: "Allahumma anta Rabbi laa ilaaha illaa anta, khalaqtanee wa ana abduka, wa ana 'alaa 'ahdika wa wa'dika mas-tata't",
    translation: "O Allah, You are my Lord. None has the right to be worshipped except You. You created me and I am Your servant, and I abide by Your covenant and promise as best I can.",
    reference: "Bukhari 7/150",
    note: "Whoever recites this with conviction in the morning or evening and dies that day/night will enter Paradise.",
  },
  {
    id: "d4",
    category: "morning-evening",
    title: "Three Protective Surahs",
    arabic: "بِسْمِ اللَّهِ الَّذِي لَا يَضُرُّ مَعَ اسْمِهِ شَيْءٌ فِي الْأَرْضِ وَلَا فِي السَّمَاءِ وَهُوَ السَّمِيعُ الْعَلِيمُ",
    translit: "Bismillaahil-ladhee laa yadurru ma'as-mihi shay'un fil-ardhi wa laa fis-samaa'i wa huwas-Samee'ul-'Aleem",
    translation: "In the name of Allah, with whose name nothing on earth or in the heavens can cause harm, and He is the All-Hearing, the All-Knowing.",
    reference: "Abu Dawud 4/323, Tirmidhi 5/465",
    note: "Recite three times morning and evening — nothing will harm you.",
  },

  /* After Prayer */
  {
    id: "d5",
    category: "after-prayer",
    title: "After Salah",
    arabic: "اللَّهُمَّ أَعِنِّي عَلَى ذِكْرِكَ، وَشُكْرِكَ، وَحُسْنِ عِبَادَتِكَ",
    translit: "Allahumma a'innee 'alaa dhikrika, wa shukrika, wa husni 'ibaadatik",
    translation: "O Allah, help me to remember You, to thank You, and to worship You in the best of manners.",
    reference: "Abu Dawud 2/86, An-Nasa'i 3/53",
  },
  {
    id: "d6",
    category: "after-prayer",
    title: "Seeking Paradise",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْجَنَّةَ، وَأَعُوذُ بِكَ مِنَ النَّارِ",
    translit: "Allahumma innee as'alukal-Jannah, wa a'oodhu bika minan-Naar",
    translation: "O Allah, I ask You for Paradise, and I seek refuge in You from the Fire.",
    reference: "Ibn Majah 2/1440",
  },

  /* Before Sleep */
  {
    id: "d7",
    category: "before-sleep",
    title: "Before Sleeping",
    arabic: "بِاسْمِكَ اللَّهُمَّ أَمُوتُ وَأَحْيَا",
    translit: "Bismika Allahumma amootu wa ahya",
    translation: "In Your name O Allah, I die and I live.",
    reference: "Bukhari 11/113",
  },
  {
    id: "d8",
    category: "before-sleep",
    title: "Forgiveness Before Sleep",
    arabic: "اللَّهُمَّ إِنِّي أَسْتَغْفِرُكَ وَأَتُوبُ إِلَيْكَ",
    translit: "Allahumma innee astaghfiruka wa atoobu ilayk",
    translation: "O Allah, I seek Your forgiveness and I turn to You in repentance.",
    reference: "Bukhari 11/101",
  },
  {
    id: "d9",
    category: "before-sleep",
    title: "Al-Mulk Protector",
    arabic: "سُبْحَانَ اللَّهِ وَبِحَمْدِهِ",
    translit: "Subhaanallaahi wa bihamdih",
    translation: "How perfect Allah is and I praise Him.",
    reference: "Bukhari 7/168",
    note: "Reciting this 100 times before sleep erases sins like the foam of the sea.",
  },

  /* Eating & Drinking */
  {
    id: "d10",
    category: "eating",
    title: "Before Eating",
    arabic: "بِسْمِ اللَّهِ",
    translit: "Bismillaah",
    translation: "In the name of Allah.",
    reference: "Abu Dawud 3/347",
    note: "If you forget, say: Bismillaahi awwalahu wa aakhirahu (In the name of Allah, at the beginning and at the end).",
  },
  {
    id: "d11",
    category: "eating",
    title: "After Eating",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي أَطْعَمَنِي هَذَا وَرَزَقَنِيهِ مِنْ غَيْرِ حَوْلٍ مِنِّي وَلَا قُوَّةٍ",
    translit: "Alhamdu lillaahil-ladhee at'amanee haadhaa wa razaqaneehi min ghayri hawlin minnee wa laa quwwah",
    translation: "Praise is to Allah Who has given me this food and sustained me with it though I was unable to do it and powerless.",
    reference: "Tirmidhi 5/506",
  },
  {
    id: "d12",
    category: "eating",
    title: "Breaking Fast (Iftar)",
    arabic: "ذَهَبَ الظَّمَأُ، وَابْتَلَّتِ الْعُرُوقُ، وَثَبَتَ الْأَجْرُ إِنْ شَاءَ اللَّهُ",
    translit: "Dhahabadh-dhama'u, wabtallatil-'urooqu, wa thabatal-ajru in shaa'Allaah",
    translation: "The thirst is gone, the veins are moistened, and the reward is confirmed, if Allah wills.",
    reference: "Abu Dawud 2/306",
  },

  /* Travel */
  {
    id: "d13",
    category: "travel",
    title: "Dua for Travel",
    arabic: "سُبْحَانَ الَّذِي سَخَّرَ لَنَا هَذَا وَمَا كُنَّا لَهُ مُقْرِنِينَ وَإِنَّا إِلَى رَبِّنَا لَمُنْقَلِبُونَ",
    translit: "Subhaanal-ladhee sakhkhara lanaa haadhaa wa maa kunnaa lahu muqrineen, wa innaa ilaa Rabinaa lamunqaliboon",
    translation: "Glory to Him Who has subjected this to us, and we could never have it (by our efforts), and to our Lord we are surely returning.",
    reference: "Quran 43:13-14",
  },
  {
    id: "d14",
    category: "travel",
    title: "Entering a Town",
    arabic: "اللَّهُمَّ بَارِكْ لَنَا فِيهَا",
    translit: "Allahumma baarik lanaa feehaa",
    translation: "O Allah, bless us in it.",
    reference: "Mustadrak of Al-Hakim",
  },

  /* Distress & Anxiety */
  {
    id: "d15",
    category: "distress",
    title: "Dua of Distress",
    arabic: "لَا إِلَهَ إِلَّا أَنْتَ سُبْحَانَكَ إِنِّي كُنْتُ مِنَ الظَّالِمِينَ",
    translit: "Laa ilaaha illaa anta subhaanaka innee kuntu minadh-dhaalimeen",
    translation: "There is no deity except You; exalted are You. Indeed, I have been of the wrongdoers.",
    reference: "Quran 21:87",
    note: "The dua of Yunus (AS) — accepted by Allah, never refused.",
  },
  {
    id: "d16",
    category: "distress",
    title: "For Anxiety & Sorrow",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنَ الْهَمِّ وَالْحَزَنِ، وَأَعُوذُ بِكَ مِنَ الْعَجْزِ وَالْكَسَلِ",
    translit: "Allahumma innee a'oodhu bika minal-hammi wal-hazan, wa a'oodhu bika minal-'ajzi wal-kasal",
    translation: "O Allah, I seek refuge in You from anxiety and sorrow, and I seek refuge in You from incapacity and laziness.",
    reference: "Bukhari 7/158",
  },
  {
    id: "d17",
    category: "distress",
    title: "In Difficult Times",
    arabic: "حَسْبُنَا اللَّهُ وَنِعْمَ الْوَكِيلُ",
    translit: "Hasbunallaahu wa ni'mal-wakeel",
    translation: "Allah is sufficient for us, and He is the best disposer of affairs.",
    reference: "Quran 3:173",
  },

  /* Seeking Forgiveness */
  {
    id: "d18",
    category: "forgiveness",
    title: "Comprehensive Forgiveness",
    arabic: "اللَّهُمَّ اغْفِرْ لِي ذَنْبِي كُلَّهُ، دِقَّهُ وَجِلَّهُ، وَأَوَّلَهُ وَآخِرَهُ، وَعَلَانِيَتَهُ وَسِرَّهُ",
    translit: "Allahum-maghfir lee dhanbee kullahu, diqqahu wa jillahu, wa awwalahu wa aakhirahu, wa 'alaaniyatahu wa sirrahu",
    translation: "O Allah, forgive me all my sins, small and great, first and last, open and secret.",
    reference: "Muslim 4/2075",
  },
  {
    id: "d19",
    category: "forgiveness",
    title: "Seeking Forgiveness (Istighfar)",
    arabic: "أَسْتَغْفِرُ اللَّهَ الْعَظِيمَ الَّذِي لَا إِلَهَ إِلَّا هُوَ الْحَيَّ الْقَيُّومَ وَأَتُوبُ إِلَيْهِ",
    translit: "Astaghfirullaahal-'Azeemal-ladhee laa ilaaha illaa Huwal-Hayyal-Qayyooma wa atoobu ilayh",
    translation: "I seek forgiveness from Allah, the Mighty, whom there is none worthy of worship except Him, the Living, the Sustainer, and I turn to Him in repentance.",
    reference: "Abu Dawud 2/85",
  },

  /* Gratitude */
  {
    id: "d20",
    category: "gratitude",
    title: "Upon Seeing a Blessing",
    arabic: "الْحَمْدُ لِلَّهِ الَّذِي بِنِعْمَتِهِ تَتِمُّ الصَّالِحَاتُ",
    translit: "Alhamdu lillaahil-ladhee bi ni'matihi tatimmus-saalihaat",
    translation: "Praise is to Allah by Whose grace good deeds are completed.",
    reference: "Ibn Majah 2/1228",
  },
  {
    id: "d21",
    category: "gratitude",
    title: "Best Form of Gratitude",
    arabic: "الْحَمْدُ لِلَّهِ حَمْدًا كَثِيرًا طَيِّبًا مُبَارَكًا فِيهِ",
    translit: "Alhamdu lillaahi hamdan katheeran tayyiban mubaarakan feeh",
    translation: "Praise is to Allah, abundant, pure, and blessed praise.",
    reference: "Bukhari 6/328",
  },

  /* Protection */
  {
    id: "d22",
    category: "protection",
    title: "Seeking Refuge",
    arabic: "أَعُوذُ بِكَلِمَاتِ اللَّهِ التَّامَّاتِ مِنْ شَرِّ مَا خَلَقَ",
    translit: "A'oodhu bikalimaatil-laahit-taammaati min sharri maa khalaq",
    translation: "I seek refuge in the perfect words of Allah from the evil of what He has created.",
    reference: "Muslim 4/2081",
    note: "Whoever says this in the evening will not be harmed by anything that night.",
  },
  {
    id: "d23",
    category: "protection",
    title: "Protection from Evil",
    arabic: "اللَّهُمَّ إِنِّي أَعُوذُ بِكَ مِنْ شَرِّ سَمْعِي، وَمِنْ شَرِّ بَصَرِي، وَمِنْ شَرِّ لِسَانِي، وَمِنْ شَرِّ قَلْبِي",
    translit: "Allahumma innee a'oodhu bika min sharri sam'ee, wa min sharri basaree, wa min sharri lisaanee, wa min sharri qalbee",
    translation: "O Allah, I seek refuge in You from the evil of my hearing, my sight, my tongue, and my heart.",
    reference: "Tirmidhi 5/489",
  },

  /* Knowledge & Wisdom */
  {
    id: "d24",
    category: "knowledge",
    title: "Dua of Prophet Musa (AS)",
    arabic: "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي",
    translit: "Rabbish-rahlee sadree wa yassir lee amree",
    translation: "My Lord, expand for me my breast, and ease for me my task.",
    reference: "Quran 20:25-26",
  },
  {
    id: "d25",
    category: "knowledge",
    title: "Seeking Beneficial Knowledge",
    arabic: "اللَّهُمَّ إِنِّي أَسْأَلُكَ عِلْمًا نَافِعًا، وَرِزْقًا طَيِّبًا، وَعَمَلًا مُتَقَبَّلًا",
    translit: "Allahumma innee as'aluka 'ilman naafi'an, wa rizqan tayyiban, wa 'amalan mutaqabbalan",
    translation: "O Allah, I ask You for beneficial knowledge, pure provision, and acceptable deeds.",
    reference: "Ibn Majah 1/264",
  },
];

export function getDuasByCategory(categoryId: string): Dua[] {
  return DUAS.filter((d) => d.category === categoryId);
}
