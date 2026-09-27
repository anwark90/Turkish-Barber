/* ============================================================
   CONFIG — edit these. Used by every page on the site.
   ============================================================ */
const CONFIG = {
  shopName: "Turkish Barbers",
  address: "The Galleria, St. Michaels Way, Metrocentre, Gateshead NE11 9YG",
  // Where customers collect what they buy. The first one is the default.
  branches: [
    { id:"green",   name:"Branch 1 — Upper Green Mall", where:"Upper Green Mall, Metrocentre, Gateshead" },
    { id:"village", name:"Branch 2 — The Village",      where:"The Village, Metrocentre, Gateshead" },
    { id:"blue",    name:"Branch 3 — Upper Blue Mall",  where:"Upper Blue Mall, Metrocentre, Gateshead" }
  ],
  // Shop's phone number: 44 + number without the leading 0, digits only
  phone: "447450280666",
  countryCode: "44",       // added to customer numbers that start with 0
  currency: "£",
  siteUrl: "",             // your website address once hosted, e.g. "https://turkishbarbers.co.uk/"
  // Google Apps Script web app URL (see README). When set, approved
  // appointments are saved and their times disappear from the booking page.
  // The same URL stores birthday club sign-ups.
  bookingsApi: "https://script.google.com/macros/s/AKfycbw-J8gaoKlQq2bx2x99ntkEwQDuiL7fQsF5i4aUPtqv9RNJ0sw7Y5jxm3WfOYny1Naj/exec",
  // The shop passcode is not kept here — it lives in the Google Apps Script,
  // so it can be changed from shop.html > Settings without touching any files.
  slotMinutes: 15,
  daysAhead: 14,
  // Birthday club: how many days before the birthday the customer is messaged,
  // and what they get. Must match BIRTHDAY_DAYS_AHEAD in the Google Apps Script.
  birthdayDaysAhead: 3,
  birthdayOffer: "50% off any service",
  hours: { // 0 = Sunday … 6 = Saturday, null = closed
    0: ["10:00","18:00"],
    1: ["09:00","21:00"],
    2: ["09:00","21:00"],
    3: ["09:00","21:00"],
    4: ["09:00","21:00"],
    5: ["09:00","21:00"],
    6: ["09:00","21:00"]
  },
  // The shop price list. `mins` is how long the chair is booked for.
  services: [
    { id:"fade",      group:"Hair & beard", name:"Skin fade",                 mins:40, price:18, desc:"Blended to the skin, razor-sharp line-up." },
    { id:"cut",       group:"Hair & beard", name:"Haircut",                   mins:30, price:16, desc:"Cut, washed and styled." },
    { id:"cutshave",  group:"Hair & beard", name:"Haircut & wet shave",       mins:60, price:33, desc:"With hot towel and nose wax." },
    { id:"pattern",   group:"Hair & beard", name:"Haircut with pattern",      mins:40, price:20, desc:"Your cut with a razor pattern." },
    { id:"scissor",   group:"Hair & beard", name:"Scissor cut",               mins:40, price:18, desc:"Scissors only, no clippers." },
    { id:"longsciss", group:"Hair & beard", name:"Long hair scissor haircut", mins:45, price:22, desc:"Scissor work for longer hair." },
    { id:"cutbeard",  group:"Hair & beard", name:"Haircut & beard shape up",  mins:45, price:24, desc:"Haircut plus beard lined up and shaped." },
    { id:"fadebeard", group:"Hair & beard", name:"Skin fade & beard shape up",mins:55, price:26, desc:"Skin fade plus full beard work." },
    { id:"oap",       group:"Hair & beard", name:"O.A.P",                     mins:30, price:11, desc:"Pensioner haircut." },
    { id:"number",    group:"Hair & beard", name:"Any number all over",       mins:15, price:11, desc:"One clipper guard, all over." },
    { id:"womancut",  group:"Hair & beard", name:"Woman short haircut",       mins:40, price:20, desc:"Short cut, styled." },

    { id:"wetshave",  group:"Shave", name:"Wet shave hot towel",              mins:30, price:22, desc:"Straight razor, hot towels and cologne." },
    { id:"headshave", group:"Shave", name:"Head shave",                       mins:30, price:22, desc:"Razor finish, hot towel." },
    { id:"beard",     group:"Shave", name:"Beard trim & shape up",            mins:20, price:14, desc:"Trimmed, shaped and lined up." },
    { id:"beardtowel",group:"Shave", name:"Beard trim & shape up, hot towel", mins:30, price:20, desc:"Beard work finished with a hot towel." },

    { id:"kidcut",    group:"Kids, up to 14", name:"Kid haircut",             mins:25, price:14, desc:"Quick, patient and neat." },
    { id:"kidfade",   group:"Kids, up to 14", name:"Kid skin fade",           mins:30, price:15, desc:"Clean fade for the little ones." },

    { id:"hairbeard", group:"Hair & beard dye", name:"Hair & beard dye",      mins:60, price:40, desc:"Colour through the hair and beard." },
    { id:"dyebeard",  group:"Hair & beard dye", name:"Beard dye",             mins:30, price:20, desc:"Beard colour, matched and blended." },
    { id:"cutdye",    group:"Hair & beard dye", name:"Haircut & hair dye",    mins:90, price:60, desc:"Any bleach and any colour, with a cut." },

    { id:"mask",      group:"Extras", name:"Face mask",                       mins:15, price:10, desc:"Cleansing mask, hot towel finish." },
    { id:"earnose",   group:"Extras", name:"Ear & nose wax",                  mins:10, price:9,  desc:"Both, clean and quick." },
    { id:"brows",     group:"Extras", name:"Eyebrow threading",               mins:10, price:7,  desc:"Tidied and shaped." },
    { id:"hairpat",   group:"Extras", name:"Hair pattern",                    mins:15, price:9,  desc:"Razor pattern on its own." },
    { id:"towel",     group:"Extras", name:"Hot towel",                       mins:10, price:6,  desc:"Hot towel and cologne." },
    { id:"nosewax",   group:"Extras", name:"Nose wax",                        mins:10, price:5,  desc:"Done in minutes." },
    { id:"earwax",    group:"Extras", name:"Ear wax or flame",                mins:10, price:5,  desc:"Traditional ear flaming or waxing." },

    { id:"wedding",   group:"Special", name:"Wedding special service",        mins:60, price:60, desc:"The full treatment for the big day." }
  ]
};
