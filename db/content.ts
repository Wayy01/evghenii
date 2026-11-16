// Services and prices were carried over from the earlier v2 project, which took them from his
// Altegio booking page. Video titles and articles are derived from the videos themselves.

export const services = [
  {
    slug: "complex",
    category: "hair",
    name_ro: "Complex: tunsoare + barbă",
    name_ru: "Комплекс: стрижка + борода",
    description_ro: "Tunsoare și barbă conturată, într-o singură vizită.",
    description_ru: "Стрижка и оформление бороды за один визит.",
    price: 700,
    duration_min: 60,
    sort_order: 0,
  },
  {
    slug: "tunsoare",
    category: "hair",
    name_ro: "Tunsoare",
    name_ru: "Стрижка",
    description_ro: "Tunsoare bărbătească adaptată formei feței și tipului de păr.",
    description_ru: "Мужская стрижка с учётом формы лица и типа волос.",
    price: 500,
    duration_min: 60,
    sort_order: 1,
  },
  {
    slug: "aranjare",
    category: "hair",
    name_ro: "Aranjare",
    name_ru: "Укладка",
    description_ro: "Spălare, uscare și aranjare cu produse de styling.",
    description_ru: "Мытьё, сушка и укладка стайлинговыми средствами.",
    price: 100,
    duration_min: 15,
    sort_order: 2,
  },
  {
    slug: "barba",
    category: "beard",
    name_ro: "Barbă",
    name_ru: "Борода",
    description_ro: "Modelarea bărbii și un contur curat.",
    description_ru: "Моделирование бороды и чёткий контур.",
    price: 350,
    duration_min: 30,
    sort_order: 3,
  },
  {
    slug: "tonare-barba",
    category: "beard",
    name_ro: "Tonarea bărbii",
    name_ru: "Тонирование бороды",
    description_ro:
      "Uniformizează culoarea și estompează firele albe, într-o nuanță apropiată de a ta.",
    description_ru: "Выравнивает цвет и приглушает седину в оттенке, близком к вашему.",
    price: 400,
    duration_min: 30,
    sort_order: 4,
  },
  {
    slug: "tonare-par",
    category: "color",
    name_ro: "Tonarea părului",
    name_ru: "Тонирование волос",
    description_ro:
      "Reîmprospătează culoarea și estompează discret firele albe, fără efect de vopsire.",
    description_ru: "Освежает цвет и деликатно скрывает седину без эффекта окрашивания.",
    price: 450,
    duration_min: 30,
    sort_order: 5,
  },
] as const;

type Reel = {
  code: string;
  takenAt: number;
  width: number;
  height: number;
  duration: number;
  featured: boolean;
  ro: string;
  ru: string;
};

// Titles of the talking videos follow what he says in them (read from the subtitles burned
// into the footage). The short clips are titled after the haircut they show. Two videos have
// no subtitles: DFr71gHOHPZ is titled from what is on screen, DZZ1izDo0ZQ stays neutral.
export const reels: Reel[] = [
  { code: "DFr71gHOHPZ", takenAt: 1738748842, width: 360, height: 638, duration: 46, featured: false, ro: "Diagnoza scalpului cu camera", ru: "Диагностика кожи головы с камерой" },
  { code: "DGnI5UJONf9", takenAt: 1740735098, width: 360, height: 640, duration: 18, featured: true, ro: "Tunsoare texturată și barbă lungă, conturată", ru: "Текстурная стрижка и длинная борода с контуром" },
  { code: "DG02ucSIc7p", takenAt: 1741195354, width: 360, height: 640, duration: 11, featured: true, ro: "Fade cu volum sus și barbă scurtă", ru: "Фейд с объёмом сверху и короткая борода" },
  { code: "DIN1-cxI5qK", takenAt: 1744181282, width: 360, height: 640, duration: 20, featured: true, ro: "Crop texturat cu tranziție joasă", ru: "Текстурный кроп с низким переходом" },
  { code: "DMz00NIoUBH", takenAt: 1754045684, width: 360, height: 640, duration: 23, featured: true, ro: "Tunsoare scurtă și barbă îngrijită", ru: "Короткая стрижка и аккуратная борода" },
  { code: "DPlKqOZCEx7", takenAt: 1759996262, width: 360, height: 640, duration: 13, featured: true, ro: "Păr mediu, aranjat într-o parte", ru: "Средняя длина, укладка набок" },
  { code: "DY95Jl_IrtF", takenAt: 1780153325, width: 720, height: 1280, duration: 60, featured: true, ro: "Aceeași față, altă frezură", ru: "То же лицо, другая стрижка" },
  { code: "DZFgHXzojin", takenAt: 1780408607, width: 720, height: 1280, duration: 31, featured: true, ro: "Păr des și pufos: ce variante ai", ru: "Густые пушистые волосы: какие есть варианты" },
  { code: "DZZ1izDo0ZQ", takenAt: 1781090957, width: 720, height: 1280, duration: 85, featured: true, ro: "Cu un client, în studio", ru: "С клиентом в студии" },
  { code: "DbBtbBSxDDr", takenAt: 1784576358, width: 720, height: 1280, duration: 88, featured: true, ro: "De ce un curs de la zero nu te face meșter", ru: "Почему курс с нуля не делает мастером" },
  { code: "DdZeaNcR7al", takenAt: 1789668734, width: 720, height: 1280, duration: 37, featured: true, ro: "Fața alungită: ce tunsoare alegi", ru: "Вытянутое лицо: какую стрижку выбрать" },
  { code: "DdjfvBbMYvp", takenAt: 1790004984, width: 720, height: 1280, duration: 62, featured: true, ro: "Fața îngustă: de ce lungime medie", ru: "Узкое лицо: почему средняя длина" },
];

type Post = {
  slug: string;
  reel: string;
  title_ro: string;
  title_ru: string;
  excerpt_ro: string;
  excerpt_ru: string;
  body_ro: string;
  body_ru: string;
};

// Each article is a written version of one video and says only what he says in it.
// Sentences in quotation marks are his own, taken from the video's subtitles (the Russian
// ones are translations). The article is dated like the video and uses its poster as cover.
export const posts: Post[] = [
  {
    slug: "fata-alungita-ce-tunsoare-alegi",
    reel: "DdZeaNcR7al",
    title_ro: "Fața alungită: ce tunsoare alegi",
    title_ru: "Вытянутое лицо: какую стрижку выбрать",
    excerpt_ro: "La o față alungită cu maxilar mai lat, tunsorile foarte scurte nu merg. E nevoie de volum pe părți.",
    excerpt_ru: "Вытянутому лицу с широкой челюстью очень короткие стрижки не подходят. Нужен объём по бокам.",
    body_ro: `Evghenii explică în video ce se întâmplă când forma feței este alungită, iar zona maxilarului e mai largă.

## Ce nu merge

Tunsorile foarte scurte pe părți. „Dacă noi facem foarte scurt, facem o formă de ou. Și eu cred că tu nu vrei așa formă.”

## Ce merge

- volum pe părți, măcar un pic;
- o formă care compensează lungimea feței, nu o accentuează.

## De ce contează alegerea

„Trebuie de făcut o alegere corectă, de consultat cu profesioniști și să te frezezi la meșteri buni.”`,
    body_ru: `В видео Евгений объясняет, что происходит, когда лицо вытянутое, а зона челюсти шире.

## Что не подходит

Очень короткие стрижки по бокам. «Если мы сделаем очень коротко, получится форма яйца. И я думаю, такую форму ты не хочешь».

## Что подходит

- объём по бокам, хотя бы немного;
- форма, которая компенсирует длину лица, а не подчёркивает её.

## Почему важен выбор

«Нужно сделать правильный выбор, посоветоваться с профессионалами и стричься у хороших мастеров».`,
  },
  {
    slug: "fata-ingusta-lungime-medie",
    reel: "DdjfvBbMYvp",
    title_ro: "Fața îngustă: de ce lungime medie",
    title_ru: "Узкое лицо: почему средняя длина",
    excerpt_ro: "La o față îngustă, o tunsoare prea scurtă scoate nasul și urechile în evidență. Lungimea medie echilibrează.",
    excerpt_ru: "При узком лице слишком короткая стрижка выделяет нос и уши. Средняя длина это уравновешивает.",
    body_ro: `Dacă forma feței este îngustă, e foarte important de ales o tunsoare potrivită și executată tehnic de un meșter bun.

## Lungime medie

Ca nasul și urechile să nu iasă foarte tare în evidență, e de dorit o lungime medie la păr.

## Dacă tu nu observi asta

„Dacă tu, ca client, asta nu observi, trebuie să alegi un meșter care observă și care o să-ți propună schimbări.”

## Exemplul din video

Evghenii ia un actor cunoscut: cu părul un pic crescut și cu o formă, silueta se schimbă și pare alt personaj. La fel a lucrat și cu clientul de pe scaun, după ce acesta și-a lăsat părul să crească puțin.

Scopul, cu vorbele lui: „să ai o tunsoare care să te avantajeze din toate punctele de vedere”.`,
    body_ru: `Если лицо узкое, очень важно выбрать подходящую стрижку, технично выполненную хорошим мастером.

## Средняя длина

Чтобы нос и уши не бросались в глаза, желательна средняя длина волос.

## Если вы сами этого не замечаете

«Если ты как клиент этого не замечаешь, нужно выбрать мастера, который замечает и предложит изменения».

## Пример из видео

Евгений берёт известного актёра: если немного отрастить волосы и придать им форму, силуэт меняется и получается другой персонаж. Так же он работал и с клиентом в кресле, после того как тот немного отрастил волосы.

Цель, его словами: «чтобы стрижка выигрышно смотрелась со всех точек зрения».`,
  },
  {
    slug: "par-des-si-pufos",
    reel: "DZFgHXzojin",
    title_ro: "Păr des și pufos: ce variante ai",
    title_ru: "Густые пушистые волосы: какие есть варианты",
    excerpt_ro: "Când părul e des și crește ca o șapcă, sunt doar câteva variante care arată bine. În video: un flow.",
    excerpt_ru: "Когда волосы густые и растут как шапка, хорошо смотрятся лишь несколько вариантов. В видео: flow.",
    body_ro: `Unele tipuri de păr sunt dese și pufoase, iar când cresc par o șapcă. Evghenii spune că în cazul ăsta sunt doar câteva variante care arată bine și solid.

## Varianta din video

Un flow. „O frizură bine aleasă și o aranjare corectă schimbă tot.”

## Alte variante

De exemplu, un side part. În video a ales flow-ul pentru că e o frezură care a fost mereu în trend și va fi.`,
    body_ru: `Бывают волосы густые и пушистые: отрастая, они выглядят как шапка. Евгений говорит, что в этом случае есть лишь несколько вариантов, которые смотрятся хорошо и солидно.

## Вариант из видео

Flow. «Хорошо подобранная стрижка и правильная укладка меняют всё».

## Другие варианты

Например, side part. В видео он выбрал flow, потому что эта стрижка всегда была в тренде и будет.`,
  },
  {
    slug: "aceeasi-fata-alta-frezura",
    reel: "DY95Jl_IrtF",
    title_ro: "Aceeași față, altă frezură",
    title_ru: "То же лицо, другая стрижка",
    excerpt_ro: "Evghenii compară două poze ale aceluiași actor. Diferența o face frezura.",
    excerpt_ru: "Евгений сравнивает две фотографии одного актёра. Разницу делает стрижка.",
    body_ro: `În video, Evghenii arată două poze ale aceluiași actor: una mai veche și una de acum.

## Ce s-a schimbat

„În primul rând, frezura. Mie, ca meșter, îmi bate la ochi freza.” Stilul în general contează și el, dar frezura e foarte importantă.

## Poza veche

Urechile se evidențiau tare. Frezura nu era nici bine aleasă, nici bine făcută.

## Poza nouă

Cu altă frezură, urechile par că s-au micșorat deodată.

## Concluzia lui

E important de ales o frezură corectă și o aranjare corectă, ca să scoatem în evidență aspectele bune și să luăm accentul de pe părțile rele.`,
    body_ru: `В видео Евгений показывает две фотографии одного актёра: старую и нынешнюю.

## Что изменилось

«В первую очередь стрижка. Мне как мастеру она сразу бросается в глаза». Стиль в целом тоже важен, но стрижка очень важна.

## Старое фото

Уши сильно выделялись. Стрижка была и подобрана, и выполнена не лучшим образом.

## Новое фото

С другой стрижкой уши будто сразу стали меньше.

## Его вывод

Важно выбрать правильную стрижку и правильную укладку, чтобы подчеркнуть удачные черты и увести внимание от неудачных.`,
  },
  {
    slug: "curs-de-la-zero",
    reel: "DbBtbBSxDDr",
    title_ro: "De ce un curs de la zero nu te face meșter",
    title_ru: "Почему курс с нуля не делает мастером",
    excerpt_ro: "Multe cursuri de barber se bazează pe fade-uri. Evghenii le pune elevilor lui baza de foarfecă.",
    excerpt_ru: "Многие барбер-курсы строятся на фейдах. Евгений ставит своим ученикам базу работы ножницами.",
    body_ro: `Evghenii pornește de la un video cu o tunsoare nereușită, făcută de niște băieți tineri. Nu îi judecă: sunt la început de drum, o să mai lucreze și o să prindă experiență.

## Greșeala

Mulți cred că, dacă fac un curs de la zero, devin profesioniști, se angajează undeva și fac foarte mulți bani. „Asta-i greșeală.”

## Ce lipsește

Foarte multe cursuri de barber de la zero sunt bazate mai mult pe fade-uri. Când se termină cursul, elevul nu poate face o asemenea frezură și nici nu poate lucra cu foarfeca.

## Ce face el cu elevii lui

- le pune baza de lucru cu foarfeca, din start;
- îi învață să înțeleagă forma și secționările;
- îi învață să analizeze fiecare client în parte.

„Nu poți să frezezi pe toți după un șablon.”`,
    body_ru: `Евгений отталкивается от видео с неудачной стрижкой, которую сделали молодые ребята. Он их не осуждает: они в начале пути, ещё поработают и наберутся опыта.

## Ошибка

Многие думают, что, пройдя курс с нуля, станут профессионалами, устроятся на работу и будут зарабатывать очень много. «Это ошибка».

## Чего не хватает

Очень многие барбер-курсы с нуля построены в основном на фейдах. Когда курс заканчивается, ученик не может ни сделать такую стрижку, ни работать ножницами.

## Что он делает со своими учениками

- с самого начала ставит базу работы ножницами;
- учит понимать форму и разделение на секции;
- учит анализировать каждого клиента отдельно.

«Нельзя стричь всех по одному шаблону».`,
  },
];

// Which reel fills each fixed spot when the site is first set up. After that the owner
// changes these in the admin (Site and Services screens); this is only the starting point.
export const initialSlots = {
  hero: "DGnI5UJONf9",
  heroInset: "DIN1-cxI5qK",
  portrait: "DZZ1izDo0ZQ",
  feature: "DFr71gHOHPZ",
  // The video in which he says each of the four "how he works" points, in order.
  points: ["DdZeaNcR7al", "DbBtbBSxDDr", "DZFgHXzojin", "DY95Jl_IrtF"],
  services: {
    complex: "DGnI5UJONf9",
    tunsoare: "DIN1-cxI5qK",
    aranjare: "DZFgHXzojin",
    barba: "DG02ucSIc7p",
    "tonare-barba": "DMz00NIoUBH",
    "tonare-par": "DPlKqOZCEx7",
  } as Record<string, string>,
};
