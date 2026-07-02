/**
 * Демо-каталог авто для подбора (марка → модель → поколение → модификация).
 *
 * ВНИМАНИЕ: данные модификаций (объём, мощность, КПП) — ориентировочные,
 * собраны вручную для демо и требуют выверки перед боевым запуском.
 * Фото поколений — Wikimedia Commons (CC), подобраны скриптом по категориям.
 */

export const CATALOG = [
  {
    make: "Toyota",
    models: [
      {
        name: "Aqua",
        generations: [
          {
            id: "aqua-p11",
            code: "P11",
            label: "2 поколение",
            yearFrom: 2021,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/The%20frontview%20of%20Toyota%20AQUA%20X%20%286AA-MXPK11-AHXNB%29.jpg?width=800",
            mods: [
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1490, hp: 116 },
              { name: "1.5 Hybrid E-Four", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 1490, hp: 116 },
            ],
          },
          {
            id: "aqua-p10",
            code: "P10",
            label: "1 поколение",
            yearFrom: 2011,
            yearTo: 2021,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Aqua%20X%20%28front%29.jpg?width=800",
            mods: [
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1496, hp: 100 },
            ],
          },
        ],
      },
      {
        name: "Vitz / Yaris",
        generations: [
          {
            id: "yaris-xp210",
            code: "XP210",
            label: "Yaris, 4 поколение",
            yearFrom: 2020,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Yaris%202020%20%28XP210%2C%20Japan%29%20front%20view.jpg?width=800",
            mods: [
              { name: "1.0", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 996, hp: 69 },
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1490, hp: 120 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1490, hp: 116 },
            ],
          },
          {
            id: "vitz-xp130",
            code: "XP130",
            label: "Vitz, 3 поколение",
            yearFrom: 2010,
            yearTo: 2020,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Vitz%20G%27s%20front.JPG?width=800",
            mods: [
              { name: "1.0", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 996, hp: 69 },
              { name: "1.3", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1329, hp: 99 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1496, hp: 100 },
            ],
          },
        ],
      },
      {
        name: "Corolla Fielder",
        generations: [
          {
            id: "fielder-e160",
            code: "E160",
            label: "Универсал, 11 поколение Corolla",
            yearFrom: 2012,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2021%20Toyota%20Corolla%20Fielder%20Hybrid%20EX%20in%20Super%20White%20II%2C%20front%20right.jpg?width=800",
            mods: [
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 103 },
              { name: "1.5 4WD", fuel: "gasoline", gearbox: "CVT", drive: "4WD", cc: 1496, hp: 103 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1496, hp: 100 },
              { name: "1.8", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1797, hp: 144 },
            ],
          },
        ],
      },
      {
        name: "Prius",
        generations: [
          {
            id: "prius-xw60",
            code: "XW60",
            label: "5 поколение",
            yearFrom: 2023,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2023%20Denver%20Auto%20Show%20Toyota%20Prius%20front%20quarter.jpg?width=800",
            mods: [
              { name: "1.8 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1797, hp: 140 },
              { name: "2.0 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1986, hp: 196 },
            ],
          },
          {
            id: "prius-xw50",
            code: "XW50",
            label: "4 поколение",
            yearFrom: 2015,
            yearTo: 2022,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20Prius%20S%20%28ZVW51%29%20in%20Thermo-Tech%20Lime%20Green%2C%20front%20left.jpg?width=800",
            mods: [
              { name: "1.8 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1797, hp: 122 },
              { name: "1.8 Hybrid E-Four", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 1797, hp: 122 },
            ],
          },
          {
            id: "prius-xw30",
            code: "XW30",
            label: "3 поколение",
            yearFrom: 2009,
            yearTo: 2015,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2009%20Toyota%20Prius%20T-Spirit%20VVT-i%20HEV%20-%201797cc%201.8%20%28134PS%29%20Hybrid%20-%20Silver%20-%2012-2023%2C%20Front.jpg?width=800",
            mods: [
              { name: "1.8 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1797, hp: 136 },
            ],
          },
        ],
      },
      {
        name: "Camry",
        generations: [
          {
            id: "camry-xv70",
            code: "XV70",
            label: "8 поколение",
            yearFrom: 2017,
            yearTo: 2023,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2018%20GAC-Toyota%20Camry%20%28front%29.jpg?width=800",
            mods: [
              { name: "2.5", fuel: "gasoline", gearbox: "AT", drive: "FF", cc: 2487, hp: 209 },
              { name: "2.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 2487, hp: 218 },
              { name: "3.5", fuel: "gasoline", gearbox: "AT", drive: "FF", cc: 3456, hp: 249 },
            ],
          },
          {
            id: "camry-xv50",
            code: "XV50",
            label: "7 поколение",
            yearFrom: 2011,
            yearTo: 2017,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Magnetic%20Bronze%202017%20Toyota%20Camry%20Atara%20S%20%40%20Hacks%20Peninsula%2C%20South%20Australia%20-%2024%20June%202026.jpg?width=800",
            mods: [
              { name: "2.5", fuel: "gasoline", gearbox: "AT", drive: "FF", cc: 2494, hp: 181 },
              { name: "2.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 2494, hp: 205 },
            ],
          },
        ],
      },
      {
        name: "RAV4",
        generations: [
          {
            id: "rav4-xa50",
            code: "XA50",
            label: "5 поколение",
            yearFrom: 2019,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2019%20Toyota%20RAV4%20Adventure%2C%20front%205.15.22.jpg?width=800",
            mods: [
              { name: "2.0", fuel: "gasoline", gearbox: "CVT", drive: "4WD", cc: 1986, hp: 171 },
              { name: "2.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 2487, hp: 222 },
            ],
          },
          {
            id: "rav4-xa40",
            code: "XA40",
            label: "4 поколение",
            yearFrom: 2012,
            yearTo: 2019,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2013%20Toyota%20RAV4%20XLE%20AWD%20front%20left.jpg?width=800",
            mods: [
              { name: "2.0", fuel: "gasoline", gearbox: "CVT", drive: "4WD", cc: 1986, hp: 146 },
              { name: "2.5", fuel: "gasoline", gearbox: "AT", drive: "4WD", cc: 2494, hp: 180 },
            ],
          },
        ],
      },
      {
        name: "Harrier",
        generations: [
          {
            id: "harrier-xu80",
            code: "XU80",
            label: "4 поколение",
            yearFrom: 2020,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Toyota%20HARRIER%20G%202WD%20%286BA-MXUA80-ANXGB%29%20front.jpg?width=800",
            mods: [
              { name: "2.0", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1986, hp: 171 },
              { name: "2.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 2487, hp: 218 },
            ],
          },
          {
            id: "harrier-xu60",
            code: "XU60",
            label: "3 поколение",
            yearFrom: 2013,
            yearTo: 2020,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2014%20Toyota%20Harrier%20%28front%29.jpg?width=800",
            mods: [
              { name: "2.0", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1986, hp: 151 },
              { name: "2.0 Turbo", fuel: "gasoline", gearbox: "AT", drive: "4WD", cc: 1998, hp: 231 },
              { name: "2.5 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 2494, hp: 197 },
            ],
          },
        ],
      },
      {
        name: "Alphard",
        generations: [
          {
            id: "alphard-ah30",
            code: "AH30",
            label: "3 поколение",
            yearFrom: 2015,
            yearTo: 2023,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2018%20Toyota%20Alphard%203.5%20V6%20in%20black%2C%20front%20right.jpg?width=800",
            mods: [
              { name: "2.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 2494, hp: 182 },
              { name: "2.5 Hybrid E-Four", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 2494, hp: 197 },
              { name: "3.5", fuel: "gasoline", gearbox: "AT", drive: "FF", cc: 3456, hp: 301 },
            ],
          },
        ],
      },
      {
        name: "Land Cruiser Prado",
        generations: [
          {
            id: "prado-j150",
            code: "J150",
            label: "4 поколение",
            yearFrom: 2009,
            yearTo: 2023,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2013-2017%20Toyota%20Land%20Cruiser%20Prado%20%28front%29.jpg?width=800",
            mods: [
              { name: "2.7", fuel: "gasoline", gearbox: "AT", drive: "4WD", cc: 2694, hp: 163 },
              { name: "2.8 Diesel", fuel: "diesel", gearbox: "AT", drive: "4WD", cc: 2755, hp: 177 },
              { name: "4.0", fuel: "gasoline", gearbox: "AT", drive: "4WD", cc: 3956, hp: 282 },
            ],
          },
        ],
      },
    ],
  },
  {
    make: "Honda",
    models: [
      {
        name: "Fit",
        generations: [
          {
            id: "fit-gr",
            code: "GR",
            label: "4 поколение",
            yearFrom: 2020,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/HONDA%20FIT%20%28GR%2CGS%29%20China.jpg?width=800",
            mods: [
              { name: "1.3", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1317, hp: 98 },
              { name: "1.5 e:HEV", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1496, hp: 109 },
            ],
          },
          {
            id: "fit-gk",
            code: "GK",
            label: "3 поколение",
            yearFrom: 2013,
            yearTo: 2020,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Honda%20FIT%20RS%20%28GK5%29%20front.jpg?width=800",
            mods: [
              { name: "1.3", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1317, hp: 100 },
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 132 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "7DCT", drive: "FF", cc: 1496, hp: 137 },
            ],
          },
        ],
      },
      {
        name: "Vezel",
        generations: [
          {
            id: "vezel-rv",
            code: "RV",
            label: "2 поколение",
            yearFrom: 2021,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Honda%20VEZEL%20e%EF%BC%9AHEV%20Z%20%286AA-RV5%29%20front.jpg?width=800",
            mods: [
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 118 },
              { name: "1.5 e:HEV", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1496, hp: 131 },
            ],
          },
          {
            id: "vezel-ru",
            code: "RU",
            label: "1 поколение",
            yearFrom: 2013,
            yearTo: 2021,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Honda%20Vezel%20Hybrid%20X%20front%20-%20Tokyo%20Motor%20Show%202013.jpg?width=800",
            mods: [
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 131 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "7DCT", drive: "FF", cc: 1496, hp: 152 },
            ],
          },
        ],
      },
      {
        name: "Freed",
        generations: [
          {
            id: "freed-gb",
            code: "GB5-GB8",
            label: "2 поколение",
            yearFrom: 2016,
            yearTo: null,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2019-2024%20Honda%20Freed%20Hybrid%20G.jpg?width=800",
            mods: [
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 129 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "7DCT", drive: "FF", cc: 1496, hp: 137 },
            ],
          },
        ],
      },
      {
        name: "Shuttle",
        generations: [
          {
            id: "shuttle-gk8",
            code: "GK8/GP7",
            label: "Универсал на базе Fit",
            yearFrom: 2015,
            yearTo: 2022,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2016%20Honda%20Shuttle%20%28GP7%29%201.5G%20station%20wagon%20%282017-11-28%29.jpg?width=800",
            mods: [
              { name: "1.5", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 132 },
              { name: "1.5 Hybrid", fuel: "hybrid", gearbox: "7DCT", drive: "FF", cc: 1496, hp: 137 },
            ],
          },
        ],
      },
      {
        name: "Stepwgn",
        generations: [
          {
            id: "stepwgn-rp",
            code: "RP",
            label: "5 поколение",
            yearFrom: 2015,
            yearTo: 2022,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/Honda%20STEPWGN%20SPADA%E3%83%BBCool%20Spirit%20Honda%20SENSING%20%28DBA-RP3%29%20front.jpg?width=800",
            mods: [
              { name: "1.5 Turbo", fuel: "gasoline", gearbox: "CVT", drive: "FF", cc: 1496, hp: 150 },
              { name: "2.0 e:HEV", fuel: "hybrid", gearbox: "e-CVT", drive: "FF", cc: 1993, hp: 184 },
            ],
          },
        ],
      },
      {
        name: "CR-V",
        generations: [
          {
            id: "crv-rw",
            code: "RW",
            label: "5 поколение",
            yearFrom: 2016,
            yearTo: 2022,
            photo:
              "https://commons.wikimedia.org/wiki/Special:FilePath/2018%20Honda%20CR-V%20EX%20i-VTEC%202.0%20Front.jpg?width=800",
            mods: [
              { name: "1.5 Turbo", fuel: "gasoline", gearbox: "CVT", drive: "4WD", cc: 1496, hp: 193 },
              { name: "2.0 Hybrid", fuel: "hybrid", gearbox: "e-CVT", drive: "4WD", cc: 1993, hp: 215 },
            ],
          },
        ],
      },
    ],
  },
];

export const FUEL_LABELS = {
  gasoline: "Бензин",
  hybrid: "Гибрид",
  diesel: "Дизель",
};
