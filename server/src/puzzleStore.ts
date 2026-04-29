import type { ConnectionsPuzzle, PuzzelrondePuzzle, OpenDeurPuzzle, LingoPuzzle } from '../../shared/types.js';

const connectionsPuzzles: ConnectionsPuzzle[] = [
  // ═══════════════════════════════════════════
  //  EASY — straightforward categories
  // ═══════════════════════════════════════════
  {
    id: 'conn-e1',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Kleuren', words: ['Rood', 'Blauw', 'Groen', 'Geel'], difficulty: 1 },
      { label: 'Fruit', words: ['Appel', 'Peer', 'Banaan', 'Kers'], difficulty: 2 },
      { label: 'Seizoenen', words: ['Lente', 'Zomer', 'Herfst', 'Winter'], difficulty: 3 },
      { label: 'Familieleden', words: ['Moeder', 'Vader', 'Zus', 'Broer'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e2',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Dieren op de boerderij', words: ['Koe', 'Kip', 'Varken', 'Schaap'], difficulty: 1 },
      { label: 'Vervoersmiddelen', words: ['Fiets', 'Auto', 'Trein', 'Bus'], difficulty: 2 },
      { label: 'Lichaamsdelen', words: ['Arm', 'Been', 'Hoofd', 'Hand'], difficulty: 3 },
      { label: 'Kleding', words: ['Broek', 'Shirt', 'Jas', 'Sok'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e3',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Groenten', words: ['Wortel', 'Ui', 'Paprika', 'Tomaat'], difficulty: 1 },
      { label: 'Schoolvakken', words: ['Wiskunde', 'Engels', 'Biologie', 'Geschiedenis'], difficulty: 2 },
      { label: 'Muziekinstrumenten', words: ['Gitaar', 'Piano', 'Drums', 'Fluit'], difficulty: 3 },
      { label: 'Planeten', words: ['Mars', 'Venus', 'Jupiter', 'Saturnus'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e4',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Bloemen', words: ['Tulp', 'Roos', 'Zonnebloem', 'Madeliefje'], difficulty: 1 },
      { label: 'Dagen van de week', words: ['Maandag', 'Woensdag', 'Vrijdag', 'Zondag'], difficulty: 2 },
      { label: 'Dranken', words: ['Koffie', 'Thee', 'Sap', 'Melk'], difficulty: 3 },
      { label: 'Maanden', words: ['Januari', 'Maart', 'Juli', 'Oktober'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e5',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Huisdieren', words: ['Hond', 'Kat', 'Konijn', 'Hamster'], difficulty: 1 },
      { label: 'Dingen in de keuken', words: ['Pan', 'Mes', 'Bord', 'Lepel'], difficulty: 2 },
      { label: 'Sporten', words: ['Voetbal', 'Tennis', 'Hockey', 'Zwemmen'], difficulty: 3 },
      { label: 'Meubels', words: ['Stoel', 'Tafel', 'Bank', 'Kast'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e6',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Bomen', words: ['Eik', 'Berk', 'Den', 'Beuk'], difficulty: 1 },
      { label: 'Nederlandse steden', words: ['Amsterdam', 'Rotterdam', 'Utrecht', 'Eindhoven'], difficulty: 2 },
      { label: 'Weersomstandigheden', words: ['Zon', 'Regen', 'Sneeuw', 'Hagel'], difficulty: 3 },
      { label: 'Vormen', words: ['Cirkel', 'Vierkant', 'Driehoek', 'Ster'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e7',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Gebak', words: ['Taart', 'Koek', 'Cake', 'Wafel'], difficulty: 1 },
      { label: 'Zeedieren', words: ['Vis', 'Krab', 'Zeester', 'Dolfijn'], difficulty: 2 },
      { label: 'Gereedschap', words: ['Hamer', 'Zaag', 'Tang', 'Boor'], difficulty: 3 },
      { label: 'Smaak', words: ['Zoet', 'Zuur', 'Zout', 'Bitter'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e8',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Insecten', words: ['Bij', 'Vlinder', 'Mier', 'Wesp'], difficulty: 1 },
      { label: 'Broodbeleg', words: ['Hagelslag', 'Pindakaas', 'Kaas', 'Jam'], difficulty: 2 },
      { label: 'Kamers in huis', words: ['Keuken', 'Badkamer', 'Slaapkamer', 'Woonkamer'], difficulty: 3 },
      { label: 'Materialen', words: ['Hout', 'Steen', 'Glas', 'Metaal'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e9',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'In de speeltuin', words: ['Schommel', 'Glijbaan', 'Wip', 'Zandbak'], difficulty: 1 },
      { label: 'Continenten', words: ['Europa', 'Azië', 'Afrika', 'Amerika'], difficulty: 2 },
      { label: 'Ontbijtproducten', words: ['Boterham', 'Ei', 'Yoghurt', 'Muesli'], difficulty: 3 },
      { label: 'Dingen die vliegen', words: ['Vogel', 'Vliegtuig', 'Raket', 'Vlieger'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-e10',
    type: 'connections',
    difficulty: 'easy',
    groups: [
      { label: 'Sprookjesfiguren', words: ['Draak', 'Heks', 'Prins', 'Fee'], difficulty: 1 },
      { label: 'Noten', words: ['Walnoot', 'Cashew', 'Pinda', 'Amandel'], difficulty: 2 },
      { label: 'Voetbalposities', words: ['Keeper', 'Verdediger', 'Middenvelder', 'Spits'], difficulty: 3 },
      { label: 'Op het strand', words: ['Zand', 'Schelp', 'Parasol', 'Handdoek'], difficulty: 4 },
    ],
  },

  // ═══════════════════════════════════════════
  //  MEDIUM — trickier overlaps, wordplay
  // ═══════════════════════════════════════════
  {
    id: 'conn-m1',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Universiteitssteden', words: ['Groningen', 'Leiden', 'Delft', 'Maastricht'], difficulty: 1 },
      { label: 'Kaassoorten', words: ['Gouda', 'Edammer', 'Leidse', 'Maaslander'], difficulty: 2 },
      { label: 'Windmolens', words: ['Wieken', 'Molen', 'Graan', 'Polder'], difficulty: 3 },
      { label: '___dam', words: ['Amster', 'Rotter', 'Volen', 'Schie'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m2',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Voetbalclubs (NL)', words: ['Ajax', 'Feyenoord', 'PSV', 'Twente'], difficulty: 1 },
      { label: 'Dieren in het bos', words: ['Hert', 'Vos', 'Uil', 'Das'], difficulty: 2 },
      { label: 'Nederlandse rivieren', words: ['Rijn', 'Maas', 'Waal', 'IJssel'], difficulty: 3 },
      { label: 'Naam + dier', words: ['Rob', 'Mees', 'Arend', 'Beer'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m3',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Nederlandse feestdagen', words: ['Koningsdag', 'Sinterklaas', 'Bevrijdingsdag', 'Carnaval'], difficulty: 1 },
      { label: 'Sporttermen', words: ['Goal', 'Set', 'Ace', 'Finish'], difficulty: 2 },
      { label: 'Watergerelateerd', words: ['Sloot', 'Gracht', 'Kanaal', 'Rivier'], difficulty: 3 },
      { label: 'Fietsen', words: ['Zadel', 'Stuur', 'Ketting', 'Band'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m4',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Dingen die je draait', words: ['Sleutel', 'Knop', 'Deksel', 'Rad'], difficulty: 1 },
      { label: 'Nederlandse gerechten', words: ['Stamppot', 'Kroket', 'Hutspot', 'Bitterballen'], difficulty: 2 },
      { label: 'Dingen op een boot', words: ['Anker', 'Mast', 'Roer', 'Zeil'], difficulty: 3 },
      { label: 'Hand___', words: ['Schoen', 'Doek', 'Rem', 'Bal'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m5',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Nederlandse schilders', words: ['Rembrandt', 'Vermeer', 'Mondriaan', 'Escher'], difficulty: 1 },
      { label: 'Gevoel', words: ['Blij', 'Boos', 'Bang', 'Verdrietig'], difficulty: 2 },
      { label: 'Nederlandse provincies', words: ['Zeeland', 'Drenthe', 'Limburg', 'Flevoland'], difficulty: 3 },
      { label: 'Kunnen ook namen zijn', words: ['Storm', 'Steen', 'Berg', 'Bos'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m6',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Op de snelweg', words: ['Vluchtstrook', 'Afrit', 'Vangrail', 'Berm'], difficulty: 1 },
      { label: 'Nederlandse zoetwaren', words: ['Stroopwafel', 'Drop', 'Pepernoot', 'Tompoes'], difficulty: 2 },
      { label: 'Schaakstukken', words: ['Koning', 'Toren', 'Loper', 'Paard'], difficulty: 3 },
      { label: '___huis', words: ['Gracht', 'Pand', 'Stad', 'Raad'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m7',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'In de badkamer', words: ['Douche', 'Spiegel', 'Handdoek', 'Zeep'], difficulty: 1 },
      { label: 'Kaartspel', words: ['Harten', 'Schoppen', 'Klaveren', 'Ruiten'], difficulty: 2 },
      { label: 'Water___', words: ['Val', 'Polo', 'Lelie', 'Schade'], difficulty: 3 },
      { label: 'Eet je op brood', words: ['Rookvlees', 'Filet', 'Leverworst', 'Cervelaat'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m8',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Beroepen', words: ['Dokter', 'Bakker', 'Kok', 'Piloot'], difficulty: 1 },
      { label: 'Op een verjaardag', words: ['Slingers', 'Cadeau', 'Ballon', 'Taart'], difficulty: 2 },
      { label: 'Zintuigen', words: ['Zien', 'Horen', 'Ruiken', 'Proeven'], difficulty: 3 },
      { label: 'Dingen die kunnen breken', words: ['Glas', 'Hart', 'Belofte', 'Record'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m9',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'TV-zenders (NL)', words: ['NPO', 'RTL', 'SBS', 'Veronica'], difficulty: 1 },
      { label: 'Sprookjes', words: ['Assepoester', 'Roodkapje', 'Sneeuwwitje', 'Doornroosje'], difficulty: 2 },
      { label: 'Dingen in een tas', words: ['Portemonnee', 'Sleutels', 'Telefoon', 'Zakdoek'], difficulty: 3 },
      { label: 'Rug___', words: ['Zak', 'Slag', 'Pijn', 'Wind'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-m10',
    type: 'connections',
    difficulty: 'medium',
    groups: [
      { label: 'Typisch Hollands', words: ['Klompen', 'Tulpen', 'Molen', 'Kaas'], difficulty: 1 },
      { label: 'Kruiden', words: ['Basilicum', 'Peterselie', 'Oregano', 'Tijm'], difficulty: 2 },
      { label: 'Dansvormen', words: ['Salsa', 'Wals', 'Tango', 'Samba'], difficulty: 3 },
      { label: 'Beginnen met B, ook een naam', words: ['Bas', 'Bram', 'Bloem', 'Beer'], difficulty: 4 },
    ],
  },

  // ═══════════════════════════════════════════
  //  HARD — heavy overlap, abstract connections, wordplay
  // ═══════════════════════════════════════════
  {
    id: 'conn-h1',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Dubbele betekenis', words: ['Bank', 'Slot', 'Bos', 'Veer'], difficulty: 1 },
      { label: '"Gouden" ___', words: ['Medaille', 'Kooi', 'Standaard', 'Eeuw'], difficulty: 2 },
      { label: 'Nederlandse koningen/koninginnen', words: ['Willem', 'Beatrix', 'Juliana', 'Wilhelmina'], difficulty: 3 },
      { label: 'Palindromen', words: ['Lepel', 'Negen', 'Radar', 'Madam'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h2',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Woorden met "ijs"', words: ['Prijs', 'Bewijs', 'Wijs', 'Grijs'], difficulty: 1 },
      { label: 'Elementen', words: ['Goud', 'Zilver', 'IJzer', 'Koper'], difficulty: 2 },
      { label: 'Muziekgenres', words: ['Pop', 'Rock', 'Jazz', 'Metal'], difficulty: 3 },
      { label: 'Zijn ook een kleur + voornaam', words: ['Rose', 'Amber', 'Violet', 'Jade'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h3',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Op een klok', words: ['Wijzer', 'Slinger', 'Kast', 'Wijzerplaat'], difficulty: 1 },
      { label: 'Valuta', words: ['Pond', 'Kroon', 'Frank', 'Gulden'], difficulty: 2 },
      { label: 'Zijn ook een achternaam', words: ['Bakker', 'Visser', 'Smit', 'Mulder'], difficulty: 3 },
      { label: '___weg', words: ['Snel', 'Spoor', 'Vlucht', 'Om'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h4',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Gaan over water', words: ['Brug', 'Veer', 'Pont', 'Sluis'], difficulty: 1 },
      { label: 'Oud-Nederlands eten', words: ['Snert', 'Rolpens', 'Zult', 'Balkenbrij'], difficulty: 2 },
      { label: '___schap', words: ['Land', 'Vriend', 'Bood', 'Maat'], difficulty: 3 },
      { label: 'Kunnen na "onder"', words: ['Broek', 'Grond', 'Wijs', 'Werp'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h5',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Dingen die draaien', words: ['Molen', 'Tol', 'Plaat', 'Aarde'], difficulty: 1 },
      { label: 'Hoofd___', words: ['Pijn', 'Rol', 'Stad', 'Prijs'], difficulty: 2 },
      { label: 'Nederlandse schrijvers', words: ['Mulisch', 'Wolkers', 'Reve', 'Hermans'], difficulty: 3 },
      { label: 'Woorden die ook een stad zijn', words: ['Nice', 'Bath', 'Cork', 'Essen'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h6',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Ouderwetse beroepen', words: ['Smid', 'Kuiper', 'Schout', 'Klerk'], difficulty: 1 },
      { label: 'Bol___', words: ['Hoed', 'Vorm', 'Werk', 'Gewas'], difficulty: 2 },
      { label: 'Dingen met gaatjes', words: ['Kaas', 'Zeef', 'Fluit', 'Knoop'], difficulty: 3 },
      { label: 'Bevatten een getal', words: ['Tweeling', 'Driehoek', 'Vierhoek', 'Zestal'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h7',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Rijmen op -acht', words: ['Nacht', 'Macht', 'Pracht', 'Pacht'], difficulty: 1 },
      { label: 'Het koninklijk huis', words: ['Paleis', 'Troon', 'Kroon', 'Oranje'], difficulty: 2 },
      { label: 'Dubbele klinker woorden', words: ['Vuur', 'Boom', 'Maan', 'Raam'], difficulty: 3 },
      { label: 'Zijn ook een maat', words: ['Voet', 'El', 'Palm', 'Span'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h8',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Mythische wezens', words: ['Feniks', 'Draak', 'Eenhoorn', 'Griffioen'], difficulty: 1 },
      { label: 'Achter___', words: ['Naam', 'Deur', 'Grond', 'Kant'], difficulty: 2 },
      { label: 'Tien___', words: ['Tallen', 'Daagse', 'Kamp', 'Jarig'], difficulty: 3 },
      { label: '3-letterwoorden, ook Engels', words: ['Arm', 'Bad', 'Dip', 'Gel'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h9',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Broodje van', words: ['Kroket', 'Frikandel', 'Kaas', 'Haring'], difficulty: 1 },
      { label: 'Voor___', words: ['Recht', 'Hoofd', 'Beeld', 'Deel'], difficulty: 2 },
      { label: 'Eindigen op -heid', words: ['Vrijheid', 'Waarheid', 'Schoonheid', 'Snelheid'], difficulty: 3 },
      { label: '... als een ___', words: ['Ezel', 'Otter', 'Beer', 'Roos'], difficulty: 4 },
    ],
  },
  {
    id: 'conn-h10',
    type: 'connections',
    difficulty: 'hard',
    groups: [
      { label: 'Vliegende dieren', words: ['Uil', 'Vleermuis', 'Mug', 'Papegaai'], difficulty: 1 },
      { label: 'Op___', words: ['Slag', 'Tocht', 'Ruiming', 'Komst'], difficulty: 2 },
      { label: 'Woorden die ook een kleur zijn', words: ['Kastanje', 'Zalm', 'Olijf', 'Aubergine'], difficulty: 3 },
      { label: 'Typisch Sinterklaas', words: ['Pepernoot', 'Schoen', 'Stoomboot', 'Mijter'], difficulty: 4 },
    ],
  },
];

const puzzelrondePuzzles: PuzzelrondePuzzle[] = [
  // ═══════════════════════════════════════════
  //  EASY — common, obvious compound words
  // ═══════════════════════════════════════════
  {
    id: 'puzz-e1',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Koningsdag, Geboortedag, Feestdag, Weekdag
      { words: ['Konings', 'Geboorte', 'Feest', 'Week'], answer: 'Dag' },
      // Sneeuwbal, Voetbal, Handbal, Basketbal
      { words: ['Sneeuw', 'Voet', 'Hand', 'Basket'], answer: 'Bal' },
      // Huiswerk, Kunstwerk, Maatwerk, Netwerk
      { words: ['Huis', 'Kunst', 'Maat', 'Net'], answer: 'Werk' },
      // Slaapkamer, Woonkamer, Badkamer, Kleedkamer
      { words: ['Slaap', 'Woon', 'Bad', 'Kleed'], answer: 'Kamer' },
    ],
  },
  {
    id: 'puzz-e2',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Hoofdpijn, Buikpijn, Rugpijn, Kiespijn
      { words: ['Hoofd', 'Buik', 'Rug', 'Kies'], answer: 'Pijn' },
      // Voordeur, Buitendeur, Kamerdeur, Achterdeur
      { words: ['Voor', 'Buiten', 'Kamer', 'Achter'], answer: 'Deur' },
      // Zonlicht, Maanlicht, Daglicht, Kaarslicht
      { words: ['Zon', 'Maan', 'Dag', 'Kaars'], answer: 'Licht' },
      // Armband, Polsband, Halsband, Haarband
      { words: ['Arm', 'Pols', 'Hals', 'Haar'], answer: 'Band' },
    ],
  },
  {
    id: 'puzz-e3',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Broodmes, Zakmes, Keukenmes, Vleesmes
      { words: ['Brood', 'Zak', 'Keuken', 'Vlees'], answer: 'Mes' },
      // Kindertijd, Schooltijd, Speeltijd, Leeftijd
      { words: ['Kinder', 'School', 'Speel', 'Leef'], answer: 'Tijd' },
      // Dagboek, Kookboek, Tekenboek, Plakboek
      { words: ['Dag', 'Kook', 'Teken', 'Plak'], answer: 'Boek' },
      // Bloempot, Koffiepot, Theepot, Verfpot
      { words: ['Bloem', 'Koffie', 'Thee', 'Verf'], answer: 'Pot' },
    ],
  },
  {
    id: 'puzz-e4',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Autoweg, Snelweg, Spoorweg, Ringweg
      { words: ['Auto', 'Snel', 'Spoor', 'Ring'], answer: 'Weg' },
      // Ziekbed, Rivierbed, Waterbed, Bloembed
      { words: ['Ziek', 'Rivier', 'Water', 'Bloem'], answer: 'Bed' },
      // Appelsap, Druivensap, Tomatensap, Groentesap
      { words: ['Appel', 'Druiven', 'Tomaten', 'Groente'], answer: 'Sap' },
      // Zwembad, Bloedbad, Voetbad, Stoombad
      { words: ['Zwem', 'Bloed', 'Voet', 'Stoom'], answer: 'Bad' },
    ],
  },
  {
    id: 'puzz-e5',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Boomhuis, Poppenhuis, Woonhuis, Klokhuis
      { words: ['Boom', 'Poppen', 'Woon', 'Klok'], answer: 'Huis' },
      // Boerenland, Vaderland, Binnenland, Buitenland
      { words: ['Boeren', 'Vader', 'Binnen', 'Buiten'], answer: 'Land' },
      // Zeilboot, Motorboot, Roeiboot, Stoomboot
      { words: ['Zeil', 'Motor', 'Roei', 'Stoom'], answer: 'Boot' },
      // Schaatsbaan, Rijbaan, Renbaan, Loopbaan
      { words: ['Schaats', 'Rij', 'Ren', 'Loop'], answer: 'Baan' },
    ],
  },
  {
    id: 'puzz-e6',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Landkaart, Speelkaart, Postkaart, Weerkaart
      { words: ['Land', 'Speel', 'Post', 'Weer'], answer: 'Kaart' },
      // Bureaustoel, Ligstoel, Kantoorstoel, Schommelstoel
      { words: ['Bureau', 'Lig', 'Kantoor', 'Schommel'], answer: 'Stoel' },
      // Handdoek, Theedoek, Vaatdoek, Hoofddoek
      { words: ['Hand', 'Thee', 'Vaat', 'Hoofd'], answer: 'Doek' },
      // Brooddoos, Schoenendoos, Snoepdoos, Cadeaudoos
      { words: ['Brood', 'Schoenen', 'Snoep', 'Cadeau'], answer: 'Doos' },
    ],
  },
  {
    id: 'puzz-e7',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Moestuin, Bloementuin, Voortuin, Daktuin
      { words: ['Moes', 'Bloemen', 'Voor', 'Dak'], answer: 'Tuin' },
      // Tafelpoot, Stoelpoot, Pianopoot, Kastpoot
      { words: ['Tafel', 'Stoel', 'Piano', 'Kast'], answer: 'Poot' },
      // Wijnglas, Bierglas, Waterglas, Cocktailglas
      { words: ['Wijn', 'Bier', 'Water', 'Cocktail'], answer: 'Glas' },
      // Wasmand, Broodmand, Fietsmand, Picknickmand
      { words: ['Was', 'Brood', 'Fiets', 'Picknick'], answer: 'Mand' },
    ],
  },
  {
    id: 'puzz-e8',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Handtas, Schooltas, Reistas, Boodschappentas
      { words: ['Hand', 'School', 'Reis', 'Boodschappen'], answer: 'Tas' },
      // Tafellamp, Bedlamp, Bureaulamp, Nachtlamp
      { words: ['Tafel', 'Bed', 'Bureau', 'Nacht'], answer: 'Lamp' },
      // Regenjas, Winterjas, Skijas, Reddingsjas
      { words: ['Regen', 'Winter', 'Ski', 'Reddings'], answer: 'Jas' },
      // Boekenkast, Klerenkast, Muurkast, IJskast
      { words: ['Boeken', 'Kleren', 'Muur', 'IJs'], answer: 'Kast' },
    ],
  },
  {
    id: 'puzz-e9',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Zandbak, Broodbak, Visbak, Afvalbak
      { words: ['Zand', 'Brood', 'Vis', 'Afval'], answer: 'Bak' },
      // Driehoek, Vierhoek, Binnenhoek, Buitenhoek
      { words: ['Drie', 'Vier', 'Binnen', 'Buiten'], answer: 'Hoek' },
      // Marktplein, Kerkplein, Dorpsplein, Schoolplein
      { words: ['Markt', 'Kerk', 'Dorps', 'School'], answer: 'Plein' },
      // Waterkraan, Brandkraan, Bouwkraan, Havenkraan
      { words: ['Water', 'Brand', 'Bouw', 'Haven'], answer: 'Kraan' },
    ],
  },
  {
    id: 'puzz-e10',
    type: 'puzzelronde',
    difficulty: 'easy',
    groups: [
      // Ochtendblad, Avondblad, Dagblad, Nieuwsblad
      { words: ['Ochtend', 'Avond', 'Dag', 'Nieuws'], answer: 'Blad' },
      // Zonnebril, Leesbril, Zwembril, Duikbril
      { words: ['Zonne', 'Lees', 'Zwem', 'Duik'], answer: 'Bril' },
      // Goudvis, Zwaardvis, Stokvis, Zaagvis
      { words: ['Goud', 'Zwaard', 'Stok', 'Zaag'], answer: 'Vis' },
      // Haarnet, Vangnet, Sleepnet, Vlindernet
      { words: ['Haar', 'Vang', 'Sleep', 'Vlinder'], answer: 'Net' },
    ],
  },

  // ═══════════════════════════════════════════
  //  MEDIUM — less obvious compound words
  // ═══════════════════════════════════════════
  {
    id: 'puzz-m1',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Veldslag, Aanslag, Neerslag, Inslag
      { words: ['Veld', 'Aan', 'Neer', 'In'], answer: 'Slag' },
      // Vuurtoren, Kerktoren, Wachttoren, Uitkijktoren
      { words: ['Vuur', 'Kerk', 'Wacht', 'Uitkijk'], answer: 'Toren' },
      // Stamboom, Stamtafel, Stamgast, Stamcafé
      { words: ['Boom', 'Tafel', 'Gast', 'Café'], answer: 'Stam' },
      // Lachspiegel, Handspiegel, Zijspiegel, Buitenspiegel
      { words: ['Lach', 'Hand', 'Zij', 'Buiten'], answer: 'Spiegel' },
    ],
  },
  {
    id: 'puzz-m2',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Deurslot, Hangslot, Cijferslot, Combinatieslot
      { words: ['Deur', 'Hang', 'Cijfer', 'Combinatie'], answer: 'Slot' },
      // Springveer, Ganzenveer, Bladveer, Schroefveer
      { words: ['Spring', 'Ganzen', 'Blad', 'Schroef'], answer: 'Veer' },
      // Windmolen, Windkracht, Windstilte, Windhoos
      { words: ['Molen', 'Kracht', 'Stil', 'Hoos'], answer: 'Wind' },
      // Tuinschaar, Heggeschaar, Schapenschaar, Nagelschaar
      { words: ['Tuin', 'Hegge', 'Schapen', 'Nagel'], answer: 'Schaar' },
    ],
  },
  {
    id: 'puzz-m3',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Associatief: Piano
      { words: ['Toetsen', 'Vleugel', 'Pedaal', 'Concert'], answer: 'Piano' },
      // Associatief: School
      { words: ['Bel', 'Krijtbord', 'Juf', 'Huiswerk'], answer: 'School' },
      // Associatief: Camping
      { words: ['Tent', 'Zwembad', 'Caravan', 'Slagboom'], answer: 'Camping' },
      // Klapbrug, Ophaalbrug, Voetbrug, Valbrug
      { words: ['Klap', 'Ophaal', 'Voet', 'Val'], answer: 'Brug' },
    ],
  },
  {
    id: 'puzz-m4',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Associatief: Maan
      { words: ['Volle', 'Krater', 'Weerwolf', 'Armstrong'], answer: 'Maan' },
      // Associatief: Koffie
      { words: ['Filter', 'Bonen', 'Barista', 'Espresso'], answer: 'Koffie' },
      // Associatief: Tequila
      { words: ['Zout', 'Citroen', 'Mexico', 'Sunrise'], answer: 'Tequila' },
      // Baksteen, Natuursteen, Hoeksteen, Grafsteen
      { words: ['Bak', 'Natuur', 'Hoek', 'Graf'], answer: 'Steen' },
    ],
  },
  {
    id: 'puzz-m5',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Brandhout, Drifthout, Sloophout, Kernhout
      { words: ['Brand', 'Drift', 'Sloop', 'Kern'], answer: 'Hout' },
      // Rijschool, Dansschool, Kookschool, Muziekschool
      { words: ['Rij', 'Dans', 'Kook', 'Muziek'], answer: 'School' },
      // Schrikkeljaar, Kalenderjaar, Nieuwjaar, Geboortejaar
      { words: ['Schrikkel', 'Kalender', 'Nieuw', 'Geboorte'], answer: 'Jaar' },
      // Waterval, Overval, Uitval, Aanval
      { words: ['Water', 'Over', 'Uit', 'Aan'], answer: 'Val' },
    ],
  },
  {
    id: 'puzz-m6',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Buslijn, Tramlijn, Hoogtelijn, Grenslijn
      { words: ['Bus', 'Tram', 'Hoogte', 'Grens'], answer: 'Lijn' },
      // Associatief: Voetbal
      { words: ['Goal', 'Buitenspel', 'Scheidsrechter', 'Grasmat'], answer: 'Voetbal' },
      // Kerstboom, Kerstcadeau, Kerstkalkoen, Kerststal
      { words: ['Boom', 'Cadeau', 'Kalkoen', 'Stal'], answer: 'Kerst' },
      // Associatief: Poker
      { words: ['Bluf', 'Fiches', 'Rivier', 'All-in'], answer: 'Poker' },
    ],
  },
  {
    id: 'puzz-m7',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Mijnenveld, Slagveld, Korenveld, Voetbalveld
      { words: ['Mijnen', 'Slag', 'Koren', 'Voetbal'], answer: 'Veld' },
      // Vuurwapen, Vuurwerk, Vuurtoren, Vuurspuwer
      { words: ['Wapen', 'Werk', 'Toren', 'Spuwer'], answer: 'Vuur' },
      // Zakgeld, Wisselgeld, Kleingeld, Spaargeld
      { words: ['Zak', 'Wissel', 'Klein', 'Spaar'], answer: 'Geld' },
      // Huisdier, Roofdier, Zoogdier, Prooidier
      { words: ['Huis', 'Roof', 'Zoog', 'Prooi'], answer: 'Dier' },
    ],
  },
  {
    id: 'puzz-m8',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Filmster, Zeester, Popster, Rockster
      { words: ['Film', 'Zee', 'Pop', 'Rock'], answer: 'Ster' },
      // Oorring, Vingerring, Sleutelring, Boksring
      { words: ['Oor', 'Vinger', 'Sleutel', 'Boks'], answer: 'Ring' },
      // Kinderwagen, Bestelwagen, Vrachtwagen, Ziekenwagen
      { words: ['Kinder', 'Bestel', 'Vracht', 'Zieken'], answer: 'Wagen' },
      // Woonplaats, Geboorteplaats, Werkplaats, Zitplaats
      { words: ['Woon', 'Geboorte', 'Werk', 'Zit'], answer: 'Plaats' },
    ],
  },
  {
    id: 'puzz-m9',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Overmacht, Luchtmacht, Volmacht, Zeemacht
      { words: ['Over', 'Lucht', 'Vol', 'Zee'], answer: 'Macht' },
      // IJzerdraad, Koperdraad, Prikkeldraad, Telefoondraad
      { words: ['IJzer', 'Koper', 'Prikkel', 'Telefoon'], answer: 'Draad' },
      // Spierkracht, Daadkracht, Mankracht, Strijdkracht
      { words: ['Spier', 'Daad', 'Man', 'Strijd'], answer: 'Kracht' },
      // Landsgrens, Stadsgrens, Snelheidsgrens, Leeftijdsgrens
      { words: ['Lands', 'Stads', 'Snelheids', 'Leeftijds'], answer: 'Grens' },
    ],
  },
  {
    id: 'puzz-m10',
    type: 'puzzelronde',
    difficulty: 'medium',
    groups: [
      // Hartvorm, Stervorm, Eivorm, Ringvorm
      { words: ['Hart', 'Ster', 'Ei', 'Ring'], answer: 'Vorm' },
      // Brandweer, Afweer, Tegenweer, Noodweer
      { words: ['Brand', 'Af', 'Tegen', 'Nood'], answer: 'Weer' },
      // Strafrecht, Kiesrecht, Erfrecht, Familierecht
      { words: ['Straf', 'Kies', 'Erf', 'Familie'], answer: 'Recht' },
      // Bouwstof, Kleurstof, Grondstof, Springstof
      { words: ['Bouw', 'Kleur', 'Grond', 'Spring'], answer: 'Stof' },
    ],
  },

  // ═══════════════════════════════════════════
  //  HARD — tricky compound words, less obvious
  // ═══════════════════════════════════════════
  {
    id: 'puzz-h1',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Kroonluchter, Kroonprins, Kroonjuweel, Kroongetuige
      { words: ['Luchter', 'Prins', 'Juweel', 'Getuige'], answer: 'Kroon' },
      // Hartslag, Vlinderslag, Borstslag, Rugslag
      { words: ['Hart', 'Vlinder', 'Borst', 'Rug'], answer: 'Slag' },
      // Ondergrond, Bovengrond, Achtergrond, Voorgrond
      { words: ['Onder', 'Boven', 'Achter', 'Voor'], answer: 'Grond' },
      // Hoogtepunt, Dieptepunt, Keerpunt, Vriespunt
      { words: ['Hoogte', 'Diepte', 'Keer', 'Vries'], answer: 'Punt' },
    ],
  },
  {
    id: 'puzz-h2',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Associatief: Diamant
      { words: ['Slijpen', 'Karaat', 'Ring', 'Onbreekbaar'], answer: 'Diamant' },
      // Associatief: Vulkaan
      { words: ['Lava', 'Uitbarsting', 'Krater', 'Pompeii'], answer: 'Vulkaan' },
      // Associatief: Champagne
      { words: ['Bubbels', 'Frankrijk', 'Toast', 'Kurk'], answer: 'Champagne' },
      // Associatief: Pyramide
      { words: ['Farao', 'Egypte', 'Driehoek', 'Sfinx'], answer: 'Pyramide' },
    ],
  },
  {
    id: 'puzz-h3',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // IJsberg, Zandberg, Rommelberg, Schuldenberg
      { words: ['IJs', 'Zand', 'Rommel', 'Schulden'], answer: 'Berg' },
      // Rietendak, Platdak, Pannendak, Stroodak
      { words: ['Rieten', 'Plat', 'Pannen', 'Stroo'], answer: 'Dak' },
      // Boomblad, Schouderblad, Weekblad, Werkblad
      { words: ['Boom', 'Schouder', 'Week', 'Werk'], answer: 'Blad' },
      // Brandmuur, Geluidsmuur, Klimmuur, Klaagmuur
      { words: ['Brand', 'Geluids', 'Klim', 'Klaag'], answer: 'Muur' },
    ],
  },
  {
    id: 'puzz-h4',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Dwaalspoor, Voetspoor, Bloedspoor, Karrenspoor
      { words: ['Dwaal', 'Voet', 'Bloed', 'Karren'], answer: 'Spoor' },
      // Associatief: Titanic
      { words: ['IJsberg', 'Onzinkbaar', 'DiCaprio', 'Ramp'], answer: 'Titanic' },
      // Associatief: Chocolade
      { words: ['Cacao', 'Bonbon', 'Reep', 'Belgie'], answer: 'Chocolade' },
      // Grondwet, Natuurwet, Kieswet, Arbeidswet
      { words: ['Grond', 'Natuur', 'Kies', 'Arbeids'], answer: 'Wet' },
    ],
  },
  {
    id: 'puzz-h5',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Toneelstuk, Mondstuk, Muziekstuk, Kunststuk
      { words: ['Toneel', 'Mond', 'Muziek', 'Kunst'], answer: 'Stuk' },
      // Koplamp, Koploper, Koptelefoon, Kopbal
      { words: ['Lamp', 'Loper', 'Telefoon', 'Bal'], answer: 'Kop' },
      // Bloemsteel, Pannensteel, Bezemsteel, Bijlsteel
      { words: ['Bloem', 'Pannen', 'Bezem', 'Bijl'], answer: 'Steel' },
      // Goederentrein, Stoomtrein, Sneltrein, Nachttrein
      { words: ['Goederen', 'Stoom', 'Snel', 'Nacht'], answer: 'Trein' },
    ],
  },
  {
    id: 'puzz-h6',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Waterleiding, Stoomleiding, Gasleiding, Pijpleiding
      { words: ['Water', 'Stoom', 'Gas', 'Pijp'], answer: 'Leiding' },
      // Associatief: Bliksem
      { words: ['Donder', 'Inslag', 'Zigzag', 'Flits'], answer: 'Bliksem' },
      // Associatief: Kompas
      { words: ['Noord', 'Naald', 'Roos', 'Richting'], answer: 'Kompas' },
      // Associatief: Schaatsen
      { words: ['IJs', 'Klap', 'Baan', 'Glijden'], answer: 'Schaatsen' },
    ],
  },
  {
    id: 'puzz-h7',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Handschoen, Handdoek, Handrem, Handschrift
      { words: ['Schoen', 'Doek', 'Rem', 'Schrift'], answer: 'Hand' },
      // Naamplaat, Grammofoonplaat, Nummerplaat, Kookplaat
      { words: ['Naam', 'Grammofoon', 'Nummer', 'Kook'], answer: 'Plaat' },
      // Fietsketting, Halsketting, Sneeuwketting, Voedselketting
      { words: ['Fiets', 'Hals', 'Sneeuw', 'Voedsel'], answer: 'Ketting' },
      // Struisvogel, Roofvogel, Trekvogel, Watervogel
      { words: ['Struis', 'Roof', 'Trek', 'Water'], answer: 'Vogel' },
    ],
  },
  {
    id: 'puzz-h8',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Strohoed, Zonnehoed, Gleufhoed, Feesthoed
      { words: ['Stro', 'Zonne', 'Gleuf', 'Feest'], answer: 'Hoed' },
      // Koplicht, Daglicht, Maanlicht, Zoeklicht
      { words: ['Kop', 'Dag', 'Maan', 'Zoek'], answer: 'Licht' },
      // Draaiorgel, Kerkorgel, Straatorgel, Pijporgel
      { words: ['Draai', 'Kerk', 'Straat', 'Pijp'], answer: 'Orgel' },
      // Kanonschot, Hagelschot, Geweerschot, Pistoolschot
      { words: ['Kanon', 'Hagel', 'Geweer', 'Pistool'], answer: 'Schot' },
    ],
  },
  {
    id: 'puzz-h9',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Slagader, Goudader, Hoofdader, Spatader
      { words: ['Slag', 'Goud', 'Hoofd', 'Spat'], answer: 'Ader' },
      // Regenworm, Lintworm, Aardworm, Boekenworm
      { words: ['Regen', 'Lint', 'Aard', 'Boeken'], answer: 'Worm' },
      // Kerkklok, Koekoeksklok, Alarmklok, Wandklok
      { words: ['Kerk', 'Koekoeks', 'Alarm', 'Wand'], answer: 'Klok' },
      // Handschrift, Tijdschrift, Voorschrift, Bijschrift
      { words: ['Hand', 'Tijd', 'Voor', 'Bij'], answer: 'Schrift' },
    ],
  },
  {
    id: 'puzz-h10',
    type: 'puzzelronde',
    difficulty: 'hard',
    groups: [
      // Doorgang, Toegang, Opgang, Rondgang
      { words: ['Door', 'Toe', 'Op', 'Rond'], answer: 'Gang' },
      // Kruistocht, Voettocht, Boottocht, Fietstocht
      { words: ['Kruis', 'Voet', 'Boot', 'Fiets'], answer: 'Tocht' },
      // Balspel, Kaartspel, Woordspel, Schouwspel
      { words: ['Bal', 'Kaart', 'Woord', 'Schouw'], answer: 'Spel' },
      // Landstreek, Wijnstreek, Kunststreek, Luchtstreek
      { words: ['Land', 'Wijn', 'Kunst', 'Lucht'], answer: 'Streek' },
    ],
  },
];

export function getConnectionsPuzzles(): ConnectionsPuzzle[] {
  return connectionsPuzzles;
}

export function getPuzzelrondePuzzles(): PuzzelrondePuzzle[] {
  return puzzelrondePuzzles;
}

// ═══════════════════════════════════════════════════════
//  OPEN DEUR PUZZLES
// ═══════════════════════════════════════════════════════
const openDeurPuzzles: OpenDeurPuzzle[] = [
  // ═══════════════════════════════════════════
  //  EASY — obvious, first-thing-you-think-of answers
  // ═══════════════════════════════════════════
  {
    id: 'od-e1',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van de Olympische Spelen?', answers: ['Goud', 'Fakkel', 'Ringen', 'Medaille'] },
      { question: 'Wat weet je van een verjaardag?', answers: ['Taart', 'Cadeau', 'Slingers', 'Kaarsjes'] },
      { question: 'Wat weet je van de ruimte?', answers: ['Raket', 'Planeet', 'Astronaut', 'Ster'] },
    ],
  },
  {
    id: 'od-e2',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van het strand?', answers: ['Zand', 'Zee', 'Handdoek', 'Parasol'] },
      { question: 'Wat weet je van Sinterklaas?', answers: ['Schoen', 'Pepernoot', 'Stoomboot', 'Piet'] },
      { question: 'Wat weet je van een ziekenhuis?', answers: ['Dokter', 'Ambulance', 'Bed', 'Verpleegster'] },
    ],
  },
  {
    id: 'od-e3',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van de brandweer?', answers: ['Slang', 'Ladder', 'Sirene', 'Brand'] },
      { question: 'Wat weet je van een pretpark?', answers: ['Achtbaan', 'Reuzenrad', 'Suikerspin', 'Kaartje'] },
      { question: 'Wat weet je van pizza?', answers: ['Kaas', 'Oven', 'Italië', 'Salami'] },
    ],
  },
  {
    id: 'od-e4',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van de maan?', answers: ['Nacht', 'Licht', 'Krater', 'Vol'] },
      { question: 'Wat weet je van een school?', answers: ['Leraar', 'Bel', 'Huiswerk', 'Schoolbord'] },
      { question: 'Wat weet je van de politie?', answers: ['Sirene', 'Uniform', 'Boete', 'Agent'] },
    ],
  },
  {
    id: 'od-e5',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van voetbal?', answers: ['Goal', 'Scheidsrechter', 'Bal', 'Elftal'] },
      { question: 'Wat weet je van een camping?', answers: ['Tent', 'Kampvuur', 'Slaapzak', 'Caravan'] },
      { question: 'Wat weet je van Kerst?', answers: ['Kerstboom', 'Ster', 'Kerstman', 'Cadeaus'] },
    ],
  },
  {
    id: 'od-e6',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van de supermarkt?', answers: ['Kassa', 'Winkelwagen', 'Boodschappen', 'Schap'] },
      { question: 'Wat weet je van een vliegtuig?', answers: ['Piloot', 'Vleugel', 'Vliegen', 'Koffer'] },
      { question: 'Wat weet je van een bioscoop?', answers: ['Popcorn', 'Scherm', 'Film', 'Stoel'] },
    ],
  },
  {
    id: 'od-e7',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van de zon?', answers: ['Stralen', 'Warm', 'Zonnebril', 'Licht'] },
      { question: 'Wat weet je van een restaurant?', answers: ['Ober', 'Menu', 'Eten', 'Tafel'] },
      { question: 'Wat weet je van de trein?', answers: ['Perron', 'Conducteur', 'Vertraging', 'Rails'] },
    ],
  },
  {
    id: 'od-e8',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van een hond?', answers: ['Blaf', 'Huisdier', 'Riem', 'Poot'] },
      { question: 'Wat weet je van een circus?', answers: ['Clown', 'Acrobaat', 'Tent', 'Leeuw'] },
      { question: 'Wat weet je van regen?', answers: ['Paraplu', 'Nat', 'Druppel', 'Regenboog'] },
    ],
  },
  {
    id: 'od-e9',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van een museum?', answers: ['Schilderij', 'Kunst', 'Tentoonstelling', 'Rondleiding'] },
      { question: 'Wat weet je van een boerderij?', answers: ['Koe', 'Tractor', 'Schuur', 'Boer'] },
      { question: 'Wat weet je van een telefoon?', answers: ['Scherm', 'App', 'Oplader', 'Bellen'] },
    ],
  },
  {
    id: 'od-e10',
    type: 'opendeur',
    difficulty: 'easy',
    questions: [
      { question: 'Wat weet je van een bibliotheek?', answers: ['Boek', 'Stilte', 'Lenen', 'Lezen'] },
      { question: 'Wat weet je van de winter?', answers: ['Sneeuw', 'Koud', 'Handschoenen', 'Schaatsen'] },
      { question: 'Wat weet je van een bakker?', answers: ['Brood', 'Oven', 'Deeg', 'Croissant'] },
    ],
  },

  // ═══════════════════════════════════════════
  //  MEDIUM — require some thinking but still logical
  // ═══════════════════════════════════════════
  {
    id: 'od-m1',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van het Oude Egypte?', answers: ['Farao', 'Piramide', 'Mummie', 'Nijl'] },
      { question: 'Wat weet je van Formule 1?', answers: ['Pitstop', 'Raceauto', 'Snelheid', 'Race'] },
      { question: 'Wat weet je van een vulkaan?', answers: ['Lava', 'Uitbarsting', 'Krater', 'As'] },
    ],
  },
  {
    id: 'od-m2',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van de Titanic?', answers: ['IJsberg', 'Zinken', 'Reddingsboot', 'Schip'] },
      { question: 'Wat weet je van sushi?', answers: ['Rijst', 'Wasabi', 'Sojasaus', 'Japan'] },
      { question: 'Wat weet je van een marathon?', answers: ['Hardlopen', 'Finish', 'Kilometer', 'Zweten'] },
    ],
  },
  {
    id: 'od-m3',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van de Tweede Wereldoorlog?', answers: ['Bevrijding', 'Bezetting', 'Verzet', 'Hitler'] },
      { question: 'Wat weet je van yoga?', answers: ['Houding', 'Meditatie', 'Mat', 'Ademhaling'] },
      { question: 'Wat weet je van Amsterdam?', answers: ['Gracht', 'Fiets', 'Anne Frank', 'Rijksmuseum'] },
    ],
  },
  {
    id: 'od-m4',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van de maffia?', answers: ['Peetvader', 'Italië', 'Geweld', 'Familie'] },
      { question: 'Wat weet je van een orkaan?', answers: ['Wind', 'Storm', 'Schade', 'Tropisch'] },
      { question: 'Wat weet je van kaas?', answers: ['Gouda', 'Holland', 'Melk', 'Gaten'] },
    ],
  },
  {
    id: 'od-m5',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van de Tour de France?', answers: ['Gele trui', 'Fietsen', 'Peloton', 'Berg'] },
      { question: 'Wat weet je van Bitcoin?', answers: ['Geld', 'Minen', 'Digitaal', 'Crypto'] },
      { question: 'Wat weet je van de Noordpool?', answers: ['IJs', 'IJsbeer', 'Kerstman', 'Koud'] },
    ],
  },
  {
    id: 'od-m6',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van het Songfestival?', answers: ['Punten', 'ABBA', 'Zingen', 'Europa'] },
      { question: 'Wat weet je van de Vikings?', answers: ['Schip', 'Noorwegen', 'Helm', 'Plunderen'] },
      { question: 'Wat weet je van chocolade?', answers: ['Cacao', 'België', 'Reep', 'Smelten'] },
    ],
  },
  {
    id: 'od-m7',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van poker?', answers: ['Bluf', 'Kaarten', 'All-in', 'Casino'] },
      { question: 'Wat weet je van de Elfstedentocht?', answers: ['Schaatsen', 'Friesland', 'IJs', 'Winter'] },
      { question: 'Wat weet je van Japan?', answers: ['Tokio', 'Samoerai', 'Sushi', 'Anime'] },
    ],
  },
  {
    id: 'od-m8',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van het menselijk lichaam?', answers: ['Hart', 'Botten', 'Bloed', 'Spieren'] },
      { question: 'Wat weet je van de Koude Oorlog?', answers: ['Berlijnse Muur', 'Rusland', 'Amerika', 'Kernwapen'] },
      { question: 'Wat weet je van carnaval?', answers: ['Masker', 'Optocht', 'Prins', 'Confetti'] },
    ],
  },
  {
    id: 'od-m9',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van Netflix?', answers: ['Serie', 'Film', 'Abonnement', 'Streamen'] },
      { question: 'Wat weet je van de Romeinen?', answers: ['Rome', 'Gladiator', 'Toga', 'Keizer'] },
      { question: 'Wat weet je van tennis?', answers: ['Racket', 'Bal', 'Wimbledon', 'Net'] },
    ],
  },
  {
    id: 'od-m10',
    type: 'opendeur',
    difficulty: 'medium',
    questions: [
      { question: 'Wat weet je van bier?', answers: ['Schuim', 'Kroeg', 'Glas', 'Pils'] },
      { question: 'Wat weet je van een verkiezing?', answers: ['Stemmen', 'Campagne', 'Debat', 'Politiek'] },
      { question: 'Wat weet je van de woestijn?', answers: ['Zand', 'Heet', 'Kameel', 'Oase'] },
    ],
  },

  // ═══════════════════════════════════════════
  //  HARD — specific knowledge needed
  // ═══════════════════════════════════════════
  {
    id: 'od-h1',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Franse Revolutie?', answers: ['Guillotine', 'Bastille', 'Napoleon', 'Adel'] },
      { question: 'Wat weet je van quantumfysica?', answers: ['Atoom', 'Deeltje', 'Onzekerheid', 'Schrödinger'] },
      { question: 'Wat weet je van de Griekse mythologie?', answers: ['Zeus', 'Olympus', 'Odysseus', 'Troje'] },
    ],
  },
  {
    id: 'od-h2',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van het Vaticaan?', answers: ['Paus', 'Sint-Pieter', 'Conclaaf', 'Kardinaal'] },
      { question: 'Wat weet je van het broeikaseffect?', answers: ['CO2', 'Opwarming', 'IJskappen', 'Methaan'] },
      { question: 'Wat weet je van het menselijk DNA?', answers: ['Chromosoom', 'Genen', 'Helix', 'Mutatie'] },
    ],
  },
  {
    id: 'od-h3',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Renaissance?', answers: ['Da Vinci', 'Florence', 'Kunst', 'Michelangelo'] },
      { question: 'Wat weet je van het schaakspel?', answers: ['Schaakmat', 'Koning', 'Toren', 'Pion'] },
      { question: 'Wat weet je van zwarte gaten?', answers: ['Zwaartekracht', 'Licht', 'Ruimte', 'Hawking'] },
    ],
  },
  {
    id: 'od-h4',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de VOC?', answers: ['Specerijen', 'Aandeel', 'Batavia', 'Handel'] },
      { question: 'Wat weet je van opera?', answers: ['Aria', 'Sopraan', 'Orkest', 'Zingen'] },
      { question: 'Wat weet je van kunstmatige intelligentie?', answers: ['Robot', 'Computer', 'Data', 'Machine learning'] },
    ],
  },
  {
    id: 'od-h5',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Berlijnse Muur?', answers: ['Oost', 'West', 'Val', 'Duitsland'] },
      { question: 'Wat weet je van whisky?', answers: ['Mout', 'Schotland', 'Vat', 'Distilleren'] },
      { question: 'Wat weet je van het zonnestelsel?', answers: ['Aarde', 'Mars', 'Zon', 'Planeet'] },
    ],
  },
  {
    id: 'od-h6',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Olympische Winterspelen?', answers: ['Bobslee', 'Schaatsen', 'Skiën', 'Sneeuw'] },
      { question: 'Wat weet je van filosofie?', answers: ['Socrates', 'Denken', 'Plato', 'Logica'] },
      { question: 'Wat weet je van het menselijk brein?', answers: ['Hersenen', 'Neuronen', 'Geheugen', 'Slim'] },
    ],
  },
  {
    id: 'od-h7',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van het Wilde Westen?', answers: ['Cowboy', 'Revolver', 'Saloon', 'Paard'] },
      { question: 'Wat weet je van jazz?', answers: ['Improvisatie', 'Saxofoon', 'Swing', 'New Orleans'] },
      { question: 'Wat weet je van de diepzee?', answers: ['Donker', 'Druk', 'Duikboot', 'Vissen'] },
    ],
  },
  {
    id: 'od-h8',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Nobelprijs?', answers: ['Stockholm', 'Dynamiet', 'Alfred Nobel', 'Vrede'] },
      { question: 'Wat weet je van de Maya\'s?', answers: ['Kalender', 'Tempel', 'Piramide', 'Mexico'] },
      { question: 'Wat weet je van wijn?', answers: ['Druif', 'Fles', 'Kurk', 'Rood'] },
    ],
  },
  {
    id: 'od-h9',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van de Gouden Eeuw?', answers: ['Rembrandt', 'VOC', 'Schilderij', 'Amsterdam'] },
      { question: 'Wat weet je van cryptografie?', answers: ['Enigma', 'Sleutel', 'Geheim', 'Code'] },
      { question: 'Wat weet je van de Bermudadriehoek?', answers: ['Verdwijnen', 'Driehoek', 'Mysterie', 'Oceaan'] },
    ],
  },
  {
    id: 'od-h10',
    type: 'opendeur',
    difficulty: 'hard',
    questions: [
      { question: 'Wat weet je van het ISS?', answers: ['Ruimte', 'Astronaut', 'Baan', 'Zweven'] },
      { question: 'Wat weet je van impressionisme?', answers: ['Monet', 'Schilderij', 'Parijs', 'Licht'] },
      { question: 'Wat weet je van de Amazone?', answers: ['Regenwoud', 'Rivier', 'Brazilië', 'Jungle'] },
    ],
  },
];

export function getOpenDeurPuzzles(): OpenDeurPuzzle[] {
  return openDeurPuzzles;
}

// ═══════════════════════════════════════════════════════
//  LINGO PUZZLES — 5 five-letter Dutch words per puzzle
// ═══════════════════════════════════════════════════════

const lingoPuzzles: LingoPuzzle[] = [
  // ═══════════════════════════════════════════
  //  EASY — common Dutch words
  // ═══════════════════════════════════════════
  { id: 'li-e1', type: 'lingo', difficulty: 'easy', words: ['APPEL', 'KAART', 'BLOEM'] },
  { id: 'li-e2', type: 'lingo', difficulty: 'easy', words: ['PAARD', 'WATER', 'BROOD'] },
  { id: 'li-e3', type: 'lingo', difficulty: 'easy', words: ['TAFEL', 'GROEP', 'AVOND'] },
  { id: 'li-e4', type: 'lingo', difficulty: 'easy', words: ['SPORT', 'VLEES', 'GROEN'] },
  { id: 'li-e5', type: 'lingo', difficulty: 'easy', words: ['PLEIN', 'VOGEL', 'TOREN'] },
  { id: 'li-e6', type: 'lingo', difficulty: 'easy', words: ['KAMER', 'DRAAK', 'PLANT'] },
  { id: 'li-e7', type: 'lingo', difficulty: 'easy', words: ['STEEN', 'LEVEN', 'FEEST'] },
  { id: 'li-e8', type: 'lingo', difficulty: 'easy', words: ['MOLEN', 'KRUIS', 'DRAAD'] },
  { id: 'li-e9', type: 'lingo', difficulty: 'easy', words: ['HEMEL', 'KRING', 'SLANG'] },
  { id: 'li-e10', type: 'lingo', difficulty: 'easy', words: ['MAAND', 'HAVEN', 'SPOOR'] },

  // ═══════════════════════════════════════════
  //  MEDIUM — less common words
  // ═══════════════════════════════════════════
  { id: 'li-m1', type: 'lingo', difficulty: 'medium', words: ['KWART', 'DWEIL', 'PLANK'] },
  { id: 'li-m2', type: 'lingo', difficulty: 'medium', words: ['KREUK', 'VLOEK', 'TROEF'] },
  { id: 'li-m3', type: 'lingo', difficulty: 'medium', words: ['PLUIM', 'GREEP', 'ZWEET'] },
  { id: 'li-m4', type: 'lingo', difficulty: 'medium', words: ['FORUM', 'DWARS', 'GEBIT'] },
  { id: 'li-m5', type: 'lingo', difficulty: 'medium', words: ['BONUS', 'KLAMP', 'FRIET'] },
  { id: 'li-m6', type: 'lingo', difficulty: 'medium', words: ['GRAAN', 'KLOOF', 'POETS'] },
  { id: 'li-m7', type: 'lingo', difficulty: 'medium', words: ['PRUIM', 'STEEG', 'DWANG'] },
  { id: 'li-m8', type: 'lingo', difficulty: 'medium', words: ['KRAMP', 'GLOED', 'TWIJG'] },
  { id: 'li-m9', type: 'lingo', difficulty: 'medium', words: ['STRIK', 'KWAAL', 'GELUK'] },
  { id: 'li-m10', type: 'lingo', difficulty: 'medium', words: ['DRAAI', 'GLIMP', 'KOETS'] },

  // ═══════════════════════════════════════════
  //  HARD — uncommon or tricky words
  // ═══════════════════════════════════════════
  { id: 'li-h1', type: 'lingo', difficulty: 'hard', words: ['SFEER', 'KWINK', 'PLOOI'] },
  { id: 'li-h2', type: 'lingo', difficulty: 'hard', words: ['ZWOEL', 'GRIJP', 'KLUIT'] },
  { id: 'li-h3', type: 'lingo', difficulty: 'hard', words: ['KROEG', 'STEMP', 'FLOEP'] },
  { id: 'li-h4', type: 'lingo', difficulty: 'hard', words: ['SNAUW', 'GLIMP', 'TROEP'] },
  { id: 'li-h5', type: 'lingo', difficulty: 'hard', words: ['GRUIS', 'ZWEEP', 'DROEG'] },
  { id: 'li-h6', type: 'lingo', difficulty: 'hard', words: ['ZWIER', 'PLUIS', 'DREUN'] },
  { id: 'li-h7', type: 'lingo', difficulty: 'hard', words: ['SLOOP', 'GRENS', 'DWING'] },
  { id: 'li-h8', type: 'lingo', difficulty: 'hard', words: ['DRUIF', 'STOER', 'GRIEP'] },
  { id: 'li-h9', type: 'lingo', difficulty: 'hard', words: ['KREEF', 'GLANS', 'PLOEG'] },
  { id: 'li-h10', type: 'lingo', difficulty: 'hard', words: ['DWERG', 'SMELT', 'GROEI'] },
];

// Valid 5-letter Dutch words for guess validation
const validLingoWords = new Set<string>([
  // Common words
  'APPEL', 'AARDE', 'AARTS', 'ABDIJ', 'ABOUT', 'ADRES', 'ADELT', 'AFVAL',
  'AGENT', 'AKKER', 'ALARM', 'ALBUM', 'ALIAS', 'AMPER', 'ANGEL', 'ANGST',
  'ANKER', 'AVANT', 'AVOND', 'BAARD', 'BAKER', 'BAKEN', 'BALIE', 'BANGE',
  'BASIS', 'BEEST', 'BEGIN', 'BELEG', 'BENDE', 'BEREIK', 'BERGE', 'BEZEM',
  'BIBEB', 'BIDET', 'BIEST', 'BINGO', 'BLAAR', 'BLANK', 'BLEEK', 'BLIEP',
  'BLIJS', 'BLIND', 'BLOEI', 'BLOEM', 'BLOKT', 'BLOND', 'BLOOT', 'BODEM',
  'BONEN', 'BONUS', 'BOMEN', 'BOORD', 'BOTER', 'BRAND', 'BREED', 'BRIEF',
  'BRIES', 'BROEK', 'BROOD', 'BROER', 'BRUID', 'BRUIN', 'BRUIS', 'BUURT',
  'CHAOS', 'COBRA', 'COYPU', 'CRIME', 'CURVE', 'CYAAN',
  'DADER', 'DARMT', 'DATUM', 'DEKEN', 'DELEN', 'DELTA', 'DRAAD', 'DRAAF',
  'DRAAI', 'DRAAK', 'DREIG', 'DREUN', 'DRINK', 'DROEG', 'DROOG', 'DROST',
  'DRUIF', 'DWAAL', 'DWAAS', 'DWANG', 'DWARS', 'DWEIL', 'DWERG', 'DWING',
  'ELAND', 'ETAGE', 'EVEN­', 'EMAIL',
  'FEEST', 'FIETS', 'FILET', 'FLETS', 'FLOEP', 'FORUM', 'FRIET', 'FRUIT',
  'FUSIE',
  'GAZON', 'GEBED', 'GEBIT', 'GELEI', 'GELUK', 'GEMAK', 'GETAL', 'GEZEL',
  'GLANS', 'GLIMP', 'GLOED', 'GNOOM', 'GOOKT', 'GRAAN', 'GRAUW', 'GREEP',
  'GREIG', 'GREIK', 'GREML', 'GRENS', 'GRIEP', 'GRIJP', 'GROEF', 'GROEN',
  'GROEI', 'GROEP', 'GROFT', 'GRUIS', 'GUNST',
  'HAVEN', 'HEKEL', 'HEMEL', 'HORDE', 'HOEST', 'HOTEL', 'HOVER', 'HULDE',
  'IDEAA', 'IKOON', 'IVOOR',
  'JEUGD', 'JOKER', 'JUBEL',
  'KABEL', 'KAART', 'KAMER', 'KAVEL', 'KLAMP', 'KLEUR', 'KLOOF', 'KLUIT',
  'KNOOP', 'KOETS', 'KOMST', 'KOPEN', 'KORST', 'KRAMP', 'KREEF', 'KREUK',
  'KRING', 'KROEG', 'KRUIK', 'KRUIS', 'KWAAL', 'KWAAM', 'KWART', 'KWAST',
  'KWEEK', 'KWELT', 'KWETS', 'KWINK',
  'LAKEN', 'LASER', 'LEGEN', 'LEVER', 'LEVEN', 'LICHT', 'LIJKT', 'LINKS',
  'LITER', 'LUCHT', 'LUNCH',
  'MAAND', 'MACHT', 'MANGO', 'MARGE', 'MEDIA', 'MELKS', 'MELIG', 'METER',
  'MODEL', 'MOLEN', 'MOTOR', 'MUREN',
  'NACHT', 'NAALD', 'NAGEL', 'NATIR', 'NAVEL', 'NEGEN', 'NERTS', 'NEVEL',
  'NOTIE', 'NYLON',
  'OFFER', 'OMEGA', 'OPZET', 'ORGEL', 'OTTER', 'OUDER',
  'PAARD', 'PANEL', 'PASTA', 'PAUZE', 'PIANO', 'PLAAT', 'PLANK', 'PLANT',
  'PLEIN', 'PLOEG', 'PLOOI', 'PLOMB', 'PLONS', 'PLUIM', 'PLUIS', 'POETS',
  'POLIS', 'POORT', 'PRIJS', 'PRUIK', 'PRUIM', 'PSALM',
  'RAILS', 'RAVEN', 'REDEN', 'REEKS', 'REGEN', 'REGIO', 'ROBOT', 'ROMAN',
  'SALDO', 'SCENE', 'SFEER', 'SJEIK', 'SLANG', 'SLEEP', 'SLOOP', 'SLOOT',
  'SMART', 'SMELT', 'SNAUW', 'SNEEUW', 'SPEEL', 'SPOOR', 'SPORT', 'STEEG',
  'STEEN', 'STEMP', 'STOEP', 'STOEL', 'STOER', 'STREP', 'STRIK', 'STROP',
  'STUIF', 'STUKS',
  'TAFEL', 'TAKEN', 'TEMPO', 'THEMA', 'TOREN', 'TROEF', 'TROEP', 'TWIJG',
  'UITSM', 'ULTRA',
  'VLEES', 'VLOEK', 'VLOOT', 'VOGEL', 'VRAAG',
  'WAGEN', 'WATER', 'WENST', 'WERKT', 'WINST', 'WORST',
  'ZEBRA', 'ZWALP', 'ZWART', 'ZWEEP', 'ZWEET', 'ZWERM', 'ZWIER', 'ZWOEL',
  // Include all puzzle words
  'SCHOOL', 'BAKER', 'DEKEN', 'HAVEN', 'SPOOR', 'HEMEL', 'WAGEN',
  'HUIS­', 'BERG­', 'BLOEM', 'STOEL', 'BROOD', 'BRIEF', 'GROEP',
  'AVOND', 'REGEN', 'PLANT', 'LEVEN', 'FEEST', 'PRIJS', 'BOTER',
  'MOLEN', 'KRUIK', 'DRAAD', 'STOEP', 'KRING', 'SLANG', 'PLAAT',
  'MAAND', 'HAVEN', 'SPOOR', 'DEKEN', 'FRUIT', 'BELEG', 'GRAAN',
]);

export function getLingoPuzzles(): LingoPuzzle[] {
  return lingoPuzzles;
}

export function isValidLingoGuess(word: string): boolean {
  // Accept any 5-letter alphabetic string (we don't strictly validate against a dictionary
  // to keep the game accessible, but we do check length and characters)
  const normalized = word.toUpperCase().trim();
  if (normalized.length !== 5) return false;
  if (!/^[A-Z]+$/.test(normalized)) return false;
  return true;
}
