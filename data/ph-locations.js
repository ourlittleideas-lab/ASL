/* ============================================================
   Philippine Cities & Municipalities
   Source: DILG / PSA official list
   NCR cities are grouped separately (no Metro Manila channel).
   Each entry becomes a chat channel: id = slugified name.
   ============================================================ */

/* Utility: convert name to channel id slug */
function toChannelId(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')   // strip diacritics
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

/* ── MAIN CHANNEL (always pinned) ─────────────────────────── */
const MAIN_CHANNEL = { id: 'main', name: 'Main', pinned: true };

/* ── NCR ───────────────────────────────────────────────────── */
const NCR_CITIES = [
  'Caloocan', 'Las Piñas', 'Makati', 'Malabon', 'Mandaluyong',
  'Manila', 'Marikina', 'Muntinlupa', 'Navotas', 'Parañaque',
  'Pasay', 'Pasig', 'Quezon City', 'San Juan', 'Taguig', 'Valenzuela',
];
const NCR_MUNICIPALITIES = ['Pateros'];

/* ── REGION DATA ───────────────────────────────────────────── */
const REGIONS = [
  {
    label: 'CAR — Cordillera',
    provinces: [
      { name: 'Abra',
        cities: ['Bangued'],
        municipalities: ['Boliney','Bucay','Bucloc','Daguioman','Danglas','Dolores','La Paz','Lacub','Lagangilang','Lagayan','Langiden','Licuan-Baay','Luba','Malibcong','Manabo','Peñarrubia','Pidigan','Pilar','Sallapadan','San Isidro','San Juan','San Quintin','Tayum','Tineg','Tubo','Villaviciosa'] },
      { name: 'Apayao',
        cities: [],
        municipalities: ['Calanasan','Flora','Kabugao','Luna','Pudtol','Santa Marcela'] },
      { name: 'Benguet',
        cities: ['Baguio'],
        municipalities: ['Atok','Bakun','Bokod','Buguias','Itogon','Kabayan','Kapangan','Kibungan','La Trinidad','Mankayan','Sablan','Tuba','Tublay'] },
      { name: 'Ifugao',
        cities: [],
        municipalities: ['Aguinaldo','Alfonso Lista','Asipulo','Banaue','Hingyon','Hungduan','Kiangan','Lagawe','Lamut','Mayoyao','Tinoc'] },
      { name: 'Kalinga',
        cities: ['Tabuk'],
        municipalities: ['Balbalan','Lubuagan','Pasil','Pinukpuk','Rizal','Tanudan','Tinglayan'] },
      { name: 'Mountain Province',
        cities: [],
        municipalities: ['Barlig','Bauko','Besao','Bontoc','Natonin','Paracelis','Sabangan','Sadanga','Sagada','Tadian'] },
    ],
  },
  {
    label: 'Region I — Ilocos',
    provinces: [
      { name: 'Ilocos Norte',
        cities: ['Laoag','Batac'],
        municipalities: ['Adams','Bacarra','Badoc','Bangui','Banna','Burgos','Carasi','Currimao','Dingras','Dumalneg','Marcos','Nueva Era','Pagudpud','Paoay','Pasuquin','Piddig','Pinili','San Nicolas','Sarrat','Solsona','Vintar'] },
      { name: 'Ilocos Sur',
        cities: ['Candon','Vigan'],
        municipalities: ['Alilem','Banayoyo','Bantay','Burgos','Cabugao','Caoayan','Cervantes','Galimuyod','Gregorio del Pilar','Lidlidda','Magsingal','Nagbukel','Narvacan','Quirino','Salcedo','San Emilio','San Esteban','San Ildefonso','San Juan','San Vicente','Santa','Santa Catalina','Santa Cruz','Santa Lucia','Santa Maria','Santiago','Santo Domingo','Sigay','Sinait','Sugpon','Suyo','Tagudin'] },
      { name: 'La Union',
        cities: ['San Fernando'],
        municipalities: ['Agoo','Aringay','Bacnotan','Bagulin','Balaoan','Bangar','Bauang','Burgos','Caba','Luna','Naguilian','Pugo','Rosario','San Gabriel','San Juan','Santo Tomas','Santol','Sudipen','Tubao'] },
      { name: 'Pangasinan',
        cities: ['Alaminos','Dagupan','San Carlos','Urdaneta'],
        municipalities: ['Agno','Aguilar','Alcala','Anda','Asingan','Balungao','Bani','Basista','Bautista','Bayambang','Binalonan','Binmaley','Bolinao','Bugallon','Burgos','Calasiao','Dasol','Infanta','Labrador','Laoac','Lingayen','Mabini','Malasiqui','Manaoag','Mangaldan','Mangatarem','Mapandan','Natividad','Pozorrubio','Rosales','San Fabian','San Jacinto','San Manuel','San Nicolas','San Quintin','Santa Barbara','Santa Maria','Santo Tomas','Sison','Sual','Tayug','Umingan','Urbiztondo','Villasis'] },
    ],
  },
  {
    label: 'Region II — Cagayan Valley',
    provinces: [
      { name: 'Batanes',
        cities: [],
        municipalities: ['Basco','Itbayat','Ivana','Mahatao','Sabtang','Uyugan'] },
      { name: 'Cagayan',
        cities: ['Tuguegarao'],
        municipalities: ['Abulug','Alcala','Allacapan','Amulung','Aparri','Baggao','Ballesteros','Buguey','Calayan','Claveria','Enrile','Gattaran','Gonzaga','Iguig','Lal-lo','Lasam','Pamplona','Peñablanca','Piat','Rizal','Sanchez-Mira','Santa Ana','Santa Praxedes','Santa Teresita','Santo Niño','Solana','Tuao'] },
      { name: 'Isabela',
        cities: ['Cauayan','Ilagan','Santiago'],
        municipalities: ['Alicia','Angadanan','Aurora','Benito Soliven','Burgos','Cabagan','Cabatuan','Cordon','Delfin Albano','Dinapigue','Divilacan','Echague','Gamu','Jones','Luna','Maconacon','Mallig','Naguilian','Palanan','Quezon','Quirino','Ramon','Reina Mercedes','Roxas','San Agustin','San Guillermo','San Isidro','San Manuel','San Mariano','San Pablo','San Mateo','Santa Maria','Santo Tomas','Tumauini'] },
      { name: 'Nueva Vizcaya',
        cities: [],
        municipalities: ['Alfonso Castañeda','Ambaguio','Aritao','Bagabag','Bambang','Bayombong','Diadi','Dupax del Norte','Dupax del Sur','Kasibu','Kayapa','Quezon','Santa Fe','Solano','Villaverde'] },
      { name: 'Quirino',
        cities: [],
        municipalities: ['Aglipay','Cabarroguis','Diffun','Maddela','Nagtipunan','Saguday'] },
    ],
  },
  {
    label: 'Region III — Central Luzon',
    provinces: [
      { name: 'Aurora',
        cities: [],
        municipalities: ['Baler','Casiguran','Dilasag','Dinalungan','Dingalan','Dipaculao','Maria Aurora','San Luis'] },
      { name: 'Bataan',
        cities: ['Balanga'],
        municipalities: ['Abucay','Bagac','Dinalupihan','Hermosa','Limay','Mariveles','Morong','Orani','Orion','Pilar','Samal'] },
      { name: 'Bulacan',
        cities: ['Malolos','Meycauayan','San Jose del Monte'],
        municipalities: ['Angat','Balagtas','Baliuag','Bocaue','Bulakan','Bustos','Calumpit','Doña Remedios Trinidad','Guiguinto','Hagonoy','Marilao','Norzagaray','Obando','Pandi','Paombong','Plaridel','Pulilan','San Ildefonso','San Miguel','San Rafael','Santa Maria'] },
      { name: 'Nueva Ecija',
        cities: ['Cabanatuan','Gapan','Palayan','San Jose'],
        municipalities: ['Aliaga','Bongabon','Cabiao','Carranglan','Cuyapo','Gabaldon','General Mamerto Natividad','General Tinio','Guimba','Jaen','Laur','Licab','Llanera','Lupao','Muñoz','Nampicuan','Pantabangan','Peñaranda','Quezon','Rizal','San Antonio','San Isidro','San Leonardo','Santa Rosa','Santo Domingo','Talavera','Talugtug','Zaragoza'] },
      { name: 'Pampanga',
        cities: ['Angeles','San Fernando'],
        municipalities: ['Apalit','Arayat','Bacolor','Candaba','Floridablanca','Guagua','Lubao','Mabalacat','Macabebe','Magalang','Masantol','Mexico','Minalin','Porac','San Luis','San Simon','Santa Ana','Santa Rita','Santo Tomas','Sasmuan'] },
      { name: 'Tarlac',
        cities: ['Tarlac City'],
        municipalities: ['Anao','Bamban','Camiling','Capas','Concepcion','Gerona','La Paz','Mayantoc','Moncada','Paniqui','Pura','Ramos','San Clemente','San Jose','San Manuel','Santa Ignacia','Victoria'] },
      { name: 'Zambales',
        cities: ['Olongapo'],
        municipalities: ['Botolan','Cabangan','Candelaria','Castillejos','Iba','Masinloc','Palauig','San Antonio','San Felipe','San Marcelino','San Narciso','Santa Cruz','Subic'] },
    ],
  },
  {
    label: 'Region IV-A — CALABARZON',
    provinces: [
      { name: 'Batangas',
        cities: ['Batangas City','Lipa','Santo Tomas','Tanauan'],
        municipalities: ['Agoncillo','Alitagtag','Balayan','Balete','Bauan','Calaca','Calatagan','Cuenca','Ibaan','Laurel','Lemery','Lian','Lobo','Mabini','Malvar','Mataas na Kahoy','Nasugbu','Padre Garcia','Rosario','San Jose','San Juan','San Luis','San Nicolas','San Pascual','Santa Teresita','Taal','Taysan','Tingloy','Tuy'] },
      { name: 'Cavite',
        cities: ['Bacoor','Cavite City','Dasmariñas','General Trias','Imus','Tagaytay','Trece Martires'],
        municipalities: ['Alfonso','Amadeo','Carmona','General Emilio Aguinaldo','General Mariano Alvarez','Indang','Kawit','Magallanes','Maragondon','Mendez','Naic','Noveleta','Rosario','Silang','Tanza','Ternate'] },
      { name: 'Laguna',
        cities: ['Biñan','Cabuyao','Calamba','San Pablo','Santa Rosa'],
        municipalities: ['Alaminos','Bay','Calauan','Cavinti','Famy','Kalayaan','Liliw','Los Baños','Luisiana','Lumban','Mabitac','Magdalena','Majayjay','Nagcarlan','Paete','Pagsanjan','Pakil','Pangil','Pila','Rizal','Santa Cruz','Santa Maria','Siniloan','Victoria'] },
      { name: 'Quezon',
        cities: ['Lucena','Tayabas'],
        municipalities: ['Agdangan','Alabat','Atimonan','Buenavista','Burdeos','Calauag','Candelaria','Catanauan','Dolores','General Luna','General Nakar','Guinayangan','Gumaca','Infanta','Jomalig','Lopez','Lucban','Macalelon','Mauban','Mulanay','Padre Burgos','Pagbilao','Panukulan','Patnanungan','Perez','Pitogo','Plaridel','Polillo','Quezon','Real','Sampaloc','San Andres','San Antonio','San Francisco','San Narciso','Sariaya','Tagkawayan','Tiaong','Unisan'] },
      { name: 'Rizal',
        cities: ['Antipolo'],
        municipalities: ['Angono','Baras','Binangonan','Cainta','Cardona','Jala-Jala','Morong','Pililla','Rodriguez','San Mateo','Tanay','Taytay','Teresa'] },
    ],
  },
  {
    label: 'Region IV-B — MIMAROPA',
    provinces: [
      { name: 'Marinduque',
        cities: [],
        municipalities: ['Boac','Buenavista','Gasan','Mogpog','Santa Cruz','Torrijos'] },
      { name: 'Occidental Mindoro',
        cities: [],
        municipalities: ['Abra de Ilog','Calintaan','Looc','Lubang','Magsaysay','Mamburao','Paluan','Rizal','Sablayan','Santa Cruz','San Jose'] },
      { name: 'Oriental Mindoro',
        cities: ['Calapan'],
        municipalities: ['Baco','Bansud','Bongabong','Bulalacao','Gloria','Mansalay','Naujan','Pinamalayan','Pola','Puerto Galera','Roxas','San Teodoro','Socorro','Victoria'] },
      { name: 'Palawan',
        cities: ['Puerto Princesa'],
        municipalities: ['Aborlan','Agutaya','Araceli','Balabac','Bataraza','Brooke\'s Point','Busuanga','Cagayancillo','Coron','Culion','Cuyo','Dumaran','El Nido','Kalayaan','Linapacan','Magsaysay','Narra','Quezon','Rizal','Roxas','San Vicente','Sofronio Española','Taytay'] },
      { name: 'Romblon',
        cities: [],
        municipalities: ['Alcantara','Banton','Cajidiocan','Calatrava','Concepcion','Corcuera','Ferrol','Looc','Magdiwang','Odiongan','Romblon','San Agustin','San Andres','San Fernando','San Jose','Santa Fe','Santa Maria'] },
    ],
  },
  {
    label: 'Region V — Bicol',
    provinces: [
      { name: 'Albay',
        cities: ['Legazpi','Ligao','Tabaco'],
        municipalities: ['Bacacay','Camalig','Daraga','Guinobatan','Jovellar','Libon','Malilipot','Malinao','Manito','Oas','Pio Duran','Polangui','Rapu-Rapu','Santo Domingo','Tiwi'] },
      { name: 'Camarines Norte',
        cities: [],
        municipalities: ['Basud','Capalonga','Daet','Jose Panganiban','Labo','Mercedes','Paracale','San Lorenzo Ruiz','San Vicente','Santa Elena','Talisay','Vinzons'] },
      { name: 'Camarines Sur',
        cities: ['Iriga','Naga'],
        municipalities: ['Baao','Balatan','Bato','Bombon','Buhi','Bula','Cabusao','Calabanga','Camaligan','Canaman','Caramoan','Del Gallego','Gainza','Garchitorena','Goa','Lagonoy','Libmanan','Lupi','Magarao','Milaor','Minalabac','Nabua','Ocampo','Pamplona','Pasacao','Pili','Presentacion','Ragay','Sagñay','San Fernando','San Jose','Sipocot','Siruma','Tigaon','Tinambac'] },
      { name: 'Catanduanes',
        cities: [],
        municipalities: ['Bagamanoc','Baras','Bato','Caramoran','Gigmoto','Pandan','Panganiban','San Andres','San Miguel','Viga','Virac'] },
      { name: 'Masbate',
        cities: ['Masbate City'],
        municipalities: ['Aroroy','Baleno','Balud','Batuan','Cataingan','Cawayan','Claveria','Dimasalang','Esperanza','Mandaon','Milagros','Mobo','Monreal','Palanas','Pio V. Corpuz','Placer','San Fernando','San Jacinto','San Pascual','Uson'] },
      { name: 'Sorsogon',
        cities: ['Sorsogon City'],
        municipalities: ['Barcelona','Bulan','Bulusan','Casiguran','Castilla','Donsol','Gubat','Irosin','Juban','Magallanes','Matnog','Pilar','Prieto Diaz','Santa Magdalena'] },
    ],
  },
  {
    label: 'Region VI — Western Visayas',
    provinces: [
      { name: 'Aklan',
        cities: ['Kalibo'],
        municipalities: ['Altavas','Balete','Banga','Batan','Buruanga','Ibajay','Lezo','Libacao','Madalag','Makato','Malay','Malinao','Nabas','New Washington','Numancia','Tangalan'] },
      { name: 'Antique',
        cities: ['San Jose de Buenavista'],
        municipalities: ['Anini-y','Barbaza','Belison','Bugasong','Caluya','Culasi','Hamtic','Laua-an','Libertad','Pandan','Patnongon','San Remigio','Sebaste','Sibalom','Tibiao','Tobias Fornier','Valderrama'] },
      { name: 'Capiz',
        cities: ['Roxas City'],
        municipalities: ['Cuartero','Dao','Dumalag','Dumarao','Ivisan','Jamindan','Maayon','Mambusao','Panay','Panitan','Pilar','Pontevedra','President Roxas','Sapian','Sigma','Tapaz'] },
      { name: 'Guimaras',
        cities: [],
        municipalities: ['Buenavista','Jordan','Nueva Valencia','San Lorenzo','Sibunag'] },
      { name: 'Iloilo',
        cities: ['Iloilo City','Passi'],
        municipalities: ['Ajuy','Alimodian','Anilao','Badiangan','Balasan','Banate','Barotac Nuevo','Barotac Viejo','Batad','Bingawan','Cabatuan','Calinog','Carles','Concepcion','Dingle','Dueñas','Dumangas','Estancia','Guimbal','Igbaras','Janiuay','Lambunao','Leganes','Lemery','Leon','Libertad','Maasin','Miagao','Mina','New Lucena','Oton','Pavia','Pototan','San Dionisio','San Enrique','San Joaquin','San Miguel','San Rafael','Santa Barbara','Sara','Tigbauan','Tubungan','Zarraga'] },
      { name: 'Negros Occidental',
        cities: ['Bacolod','Bago','Cadiz','Escalante','Himamaylan','Kabankalan','La Carlota','Sagay','San Carlos','Silay','Sipalay','Talisay','Victorias'],
        municipalities: ['Binalbagan','Calatrava','Candoni','Cauayan','Don Salvador Benedicto','Enrique B. Magalona','Hinoba-an','Ilog','Isabela','La Castellana','Manapla','Moises Padilla','Murcia','Pontevedra','Pulupandan','San Enrique','Toboso','Valladolid'] },
    ],
  },
  {
    label: 'Region VII — Central Visayas',
    provinces: [
      { name: 'Bohol',
        cities: ['Tagbilaran'],
        municipalities: ['Alburquerque','Alicia','Anda','Antequera','Baclayon','Balilihan','Batuan','Bien Unido','Bilar','Buenavista','Calape','Candijay','Carmen','Catigbian','Clarin','Corella','Cortes','Dagohoy','Danao','Dauis','Dimiao','Duero','Garcia Hernandez','Getafe','Guindulman','Inabanga','Jagna','Lila','Loay','Loboc','Loon','Mabini','Maribojoc','Panglao','Pilar','President Carlos P. Garcia','Sagbayan','San Isidro','San Miguel','Sevilla','Sierra Bullones','Sikatuna','Talibon','Trinidad','Tubigon','Ubay','Valencia'] },
      { name: 'Cebu',
        cities: ['Bogo','Carcar','Cebu City','Danao','Lapu-Lapu','Mandaue','Naga','Talisay','Toledo'],
        municipalities: ['Alcantara','Alcoy','Alegria','Aloguinsan','Argao','Asturias','Badian','Balamban','Bantayan','Barili','Boljoon','Borbon','Compostela','Consolacion','Cordova','Daanbantayan','Dalaguete','Dumanjug','Ginatilan','Liloan','Madridejos','Malabuyoc','Medellin','Minglanilla','Moalboal','Oslob','Pilar','Pinamungajan','Poro','Ronda','Samboan','San Fernando','San Francisco','San Remigio','Santa Fe','Santander','Sibonga','Sogod','Tabogon','Tabuelan','Tuburan','Tudela'] },
      { name: 'Negros Oriental',
        cities: ['Bais','Bayawan','Canlaon','Dumaguete','Guihulngan','Tanjay'],
        municipalities: ['Amlan','Ayungon','Bacong','Basay','Bindoy','Dauin','Jimalalud','La Libertad','Mabinay','Manjuyod','Pamplona','San Jose','Santa Catalina','Siaton','Sibulan','Tayasan','Valencia','Vallehermoso','Zamboanguita'] },
      { name: 'Siquijor',
        cities: [],
        municipalities: ['Enrique Villanueva','Larena','Lazi','Maria','San Juan','Siquijor'] },
    ],
  },
  {
    label: 'Region VIII — Eastern Visayas',
    provinces: [
      { name: 'Biliran',
        cities: [],
        municipalities: ['Almeria','Biliran','Cabucgayan','Caibiran','Culaba','Kawayan','Maripipi','Naval'] },
      { name: 'Eastern Samar',
        cities: ['Borongan'],
        municipalities: ['Arteche','Balangiga','Balangkayan','Can-avid','Dolores','General MacArthur','Giporlos','Guiuan','Hernani','Jipapad','Lawaan','Llorente','Maslog','Maydolong','Mercedes','Oras','Quinapondan','Salcedo','San Julian','San Policarpo','Sulat','Taft'] },
      { name: 'Leyte',
        cities: ['Baybay','Ormoc','Tacloban'],
        municipalities: ['Abuyog','Alangalang','Albuera','Babatngon','Bato','Barugo','Burauen','Calubian','Capoocan','Carigara','Dagami','Dulag','Hilongos','Hindang','Inopacan','Isabel','Jaro','Javier','Julita','Kananga','La Paz','Leyte','MacArthur','Mahaplag','Matag-ob','Matalom','Mayorga','Merida','Palo','Palompon','Pastrana','San Isidro','San Miguel','Santa Fe','Tabango','Tabontabon','Tanauan','Tolosa','Tunga','Villaba'] },
      { name: 'Northern Samar',
        cities: ['Catarman'],
        municipalities: ['Allen','Biri','Bobon','Capul','Catubig','Gamay','Laoang','Lapinig','Las Navas','Lavezares','Lope de Vega','Mapanas','Mondragon','Palapag','Pambujan','Rosario','San Antonio','San Isidro','San Jose','San Roque','San Vicente','Silvino Lobos','Victoria'] },
      { name: 'Samar',
        cities: ['Calbayog','Catbalogan'],
        municipalities: ['Almagro','Basey','Calbiga','Daram','Gandara','Hinabangan','Jiabong','Marabut','Matuguinao','Motiong','Pagsanghan','Paranas','Pinabacdao','San Jorge','San Jose de Buan','San Sebastian','Santa Margarita','Santa Rita','Santo Niño','Tagapul-an','Talalora','Tarangnan','Villareal','Zumarraga'] },
      { name: 'Southern Leyte',
        cities: ['Maasin'],
        municipalities: ['Anahawan','Bontoc','Hinunangan','Hinundayan','Libagon','Liloan','Limasawa','Macrohon','Malitbog','Padre Burgos','Pintuyan','Saint Bernard','San Francisco','San Juan','San Ricardo','Silago','Sogod','Tomas Oppus'] },
    ],
  },
  {
    label: 'Region IX — Zamboanga Peninsula',
    provinces: [
      { name: 'Zamboanga del Norte',
        cities: ['Dapitan','Dipolog'],
        municipalities: ['Baliguian','Godod','Gutalac','Jose Dalman','Kalawit','Katipunan','La Libertad','Labason','Liloy','Manukan','Mutia','Piñan','Polanco','President Manuel A. Roxas','Rizal','Salug','San Miguel','Sergio Osmeña Sr.','Siayan','Sibuco','Sibutad','Sindangan','Siocon','Sirawai','Tampilisan'] },
      { name: 'Zamboanga del Sur',
        cities: ['Pagadian','Zamboanga City'],
        municipalities: ['Aurora','Bayog','Dimataling','Dinas','Dumalinao','Dumingag','Guipos','Josefina','Kumalarang','Labangan','Lakewood','Lapuyan','Mahayag','Margosatubig','Midsalip','Molave','Ramon Magsaysay','San Miguel','San Pablo','Sominot','Tabina','Tambulig','Tukuran','Vincenzo Sagun'] },
      { name: 'Zamboanga Sibugay',
        cities: ['Ipil'],
        municipalities: ['Alicia','Buug','Diplahan','Imelda','Kabasalan','Mabuhay','Malangas','Naga','Olutanga','Payao','Roseller Lim','Siay','Talusan','Titay','Tungawan'] },
    ],
  },
  {
    label: 'Region X — Northern Mindanao',
    provinces: [
      { name: 'Bukidnon',
        cities: ['Malaybalay','Valencia'],
        municipalities: ['Baungon','Cabanglasan','Damulog','Dangcagan','Don Carlos','Impasugong','Kadingilan','Kalilangan','Kibawe','Kitaotao','Lantapan','Libona','Malitbog','Manolo Fortich','Maramag','Pangantucan','Quezon','San Fernando','Sumilao','Talakag'] },
      { name: 'Camiguin',
        cities: [],
        municipalities: ['Catarman','Guinsiliban','Mahinog','Mambajao','Sagay'] },
      { name: 'Lanao del Norte',
        cities: ['Iligan'],
        municipalities: ['Bacolod','Baloi','Baroy','Kapatagan','Kauswagan','Kolambugan','Lala','Linamon','Maigo','Matungao','Munai','Nunungan','Pantao Ragat','Pantar','Poona Piagapo','Salvador','Sapad','Sultan Naga Dimaporo','Tagoloan','Tangkal'] },
      { name: 'Misamis Occidental',
        cities: ['Oroquieta','Ozamiz','Tangub'],
        municipalities: ['Aloran','Baliangao','Bonifacio','Calamba','Clarin','Concepcion','Don Victoriano Chiongbian','Jimenez','Lopez Jaena','Panaon','Plaridel','Sapang Dalaga','Sinacaban','Tudela'] },
      { name: 'Misamis Oriental',
        cities: ['Cagayan de Oro','Gingoog','El Salvador'],
        municipalities: ['Alubijid','Balingasag','Balingoan','Binuangan','Claveria','Gitagum','Initao','Jasaan','Kinoguitan','Lagonglong','Laguindingan','Libertad','Lugait','Magsaysay','Manticao','Medina','Naawan','Opol','Salay','Sugbongcogon','Tagoloan','Talisayan','Villanueva'] },
    ],
  },
  {
    label: 'Region XI — Davao',
    provinces: [
      { name: 'Davao de Oro',
        cities: [],
        municipalities: ['Compostela','Laak','Mabini','Maco','Maragusan','Mawab','Monkayo','Montevista','Nabunturan','New Bataan','Pantukan'] },
      { name: 'Davao del Norte',
        cities: ['Panabo','Tagum','Island Garden City of Samal'],
        municipalities: ['Asuncion','Braulio E. Dujali','Carmen','Kapalong','New Corella','San Isidro','Santo Tomas','Talaingod'] },
      { name: 'Davao del Sur',
        cities: ['Davao City','Digos'],
        municipalities: ['Bansalan','Hagonoy','Kiblawan','Magsaysay','Malalag','Matanao','Padada','Santa Cruz','Sulop'] },
      { name: 'Davao Occidental',
        cities: [],
        municipalities: ['Don Marcelino','Jose Abad Santos','Malita','Santa Maria','Sarangani'] },
      { name: 'Davao Oriental',
        cities: ['Mati'],
        municipalities: ['Baganga','Banaybanay','Boston','Caraga','Cateel','Governor Generoso','Lupon','Manay','San Isidro','Tarragona'] },
    ],
  },
  {
    label: 'Region XII — SOCCSKSARGEN',
    provinces: [
      { name: 'North Cotabato',
        cities: ['Kidapawan'],
        municipalities: ['Alamada','Aleosan','Arakan','Banisilan','Carmen','Kabacan','Libungan','Magpet','Makilala','Matalam','Midsayap','Mlang','Pigkawayan','Pikit','President Roxas','Tulunan'] },
      { name: 'Sarangani',
        cities: [],
        municipalities: ['Alabel','Glan','Kiamba','Maasim','Maitum','Malapatan','Malungon'] },
      { name: 'South Cotabato',
        cities: ['Koronadal'],
        municipalities: ['Banga','Lake Sebu','Norala','Polomolok','Santo Niño','Surallah','T\'Boli','Tampakan','Tantangan','Tupi'] },
      { name: 'Sultan Kudarat',
        cities: ['Tacurong'],
        municipalities: ['Bagumbayan','Columbio','Esperanza','Isulan','Kalamansig','Lambayong','Lebak','Lutayan','Palimbang','President Quirino','Senator Ninoy Aquino'] },
    ],
  },
  {
    label: 'Region XIII — Caraga',
    provinces: [
      { name: 'Agusan del Norte',
        cities: ['Butuan','Cabadbaran'],
        municipalities: ['Buenavista','Carmen','Jabonga','Kitcharao','Las Nieves','Magallanes','Nasipit','Remedios T. Romualdez','Santiago','Tubay'] },
      { name: 'Agusan del Sur',
        cities: ['Bayugan'],
        municipalities: ['Bunawan','Esperanza','La Paz','Loreto','Prosperidad','Rosario','San Francisco','San Luis','Santa Josefa','Sibagat','Talacogon','Trento','Veruela'] },
      { name: 'Dinagat Islands',
        cities: [],
        municipalities: ['Basilisa','Cagdianao','Dinagat','Libjo','Loreto','San Jose','Tubajon'] },
      { name: 'Surigao del Norte',
        cities: ['Surigao City'],
        municipalities: ['Alegria','Bacuag','Burgos','Claver','Dapa','Del Carmen','General Luna','Gigaquit','Mainit','Malimono','Pilar','Placer','San Benito','San Francisco','San Isidro','Santa Monica','Sison','Socorro','Tagana-an','Tubod'] },
      { name: 'Surigao del Sur',
        cities: ['Bislig','Tandag'],
        municipalities: ['Barobo','Bayabas','Cagwait','Cantilan','Carmen','Carrascal','Cortes','Hinatuan','Lanuza','Lianga','Lingig','Madrid','Marihatag','San Agustin','San Miguel','Tagbina','Tago'] },
    ],
  },
  {
    label: 'BARMM — Bangsamoro',
    provinces: [
      { name: 'Basilan',
        cities: ['Isabela City','Lamitan'],
        municipalities: ['Akbar','Al-Barka','Hadji Mohammad Ajul','Hadji Muhtamad','Lantawan','Maluso','Sumisip','Tabuan-Lasa','Tipo-Tipo','Tuburan','Ungkaya Pukan'] },
      { name: 'Lanao del Sur',
        cities: ['Marawi'],
        municipalities: ['Bacolod-Kalawi','Balabagan','Balindong','Bayang','Binidayan','Bubong','Butig','Calanogas','Ditsaan-Ramain','Ganassi','Kapai','Kapatagan','Lumba-Bayabao','Lumbaca-Unayan','Lumbatan','Lumbayanague','Madalum','Madamba','Maguing','Malabang','Marantao','Marogong','Masiu','Mulondo','Pagayawan','Piagapo','Picong','Poona Bayabao','Pualas','Saguiaran','Sultan Dumalondong','Sultan Gumander','Tamparan','Taraka','Tubaran','Tugaya','Wao'] },
      { name: 'Maguindanao del Norte',
        cities: ['Cotabato City'],
        municipalities: ['Barira','Buldon','Datu Blah T. Sinsuat','Datu Odin Sinsuat','Kabuntalan','Matanog','Parang','Sultan Kudarat','Sultan Mastura','Upi'] },
      { name: 'Maguindanao del Sur',
        cities: [],
        municipalities: ['Ampatuan','Buluan','Datu Abdullah Sangki','Datu Anggal Midtimbang','Datu Hoffer Ampatuan','Datu Montawal','Datu Paglas','Datu Piang','Datu Salibo','Datu Saudi-Ampatuan','Datu Unsay','Gen. Salipada K. Pendatun','Guindulungan','Mamasapano','Mangudadatu','Northern Kabuntalan','Pagagawan','Pagalungan','Paglat','Pandag','Rajah Buayan','Shariff Aguak','Shariff Saydona Mustapha','South Upi','Sultan sa Barongis','Talayan','Talitay'] },
      { name: 'Sulu',
        cities: ['Jolo'],
        municipalities: ['Hadji Panglima Tahil','Indanan','Kalingalan Caluang','Lugus','Luuk','Maimbung','Old Panamao','Omar','Pandami','Panglima Estino','Pangutaran','Parang','Pata','Patikul','Siasi','Talipao','Tapul','Tongkil'] },
      { name: 'Tawi-Tawi',
        cities: ['Bongao'],
        municipalities: ['Languyan','Mapun','Panglima Sugala','Sapa-Sapa','Sibutu','Simunul','Sitangkai','South Ubian','Tandubas','Turtle Islands'] },
    ],
  },
];

/* ── CHANNEL GENERATION ─────────────────────────────────────── */

/**
 * Build the flat array of all channels the app uses.
 * Returns: [{ id, name, region, province, isNCR }]
 */
function buildAllChannels() {
  const channels = [MAIN_CHANNEL];

  /* NCR */
  for (const city of NCR_CITIES) {
    channels.push({ id: toChannelId(city), name: city, region: 'NCR', isNCR: true });
  }
  for (const mun of NCR_MUNICIPALITIES) {
    channels.push({ id: toChannelId(mun), name: mun, region: 'NCR', isNCR: true });
  }

  /* All other regions */
  for (const region of REGIONS) {
    for (const province of region.provinces) {
      for (const city of province.cities) {
        channels.push({
          id: toChannelId(city),
          name: city,
          region: region.label,
          province: province.name,
          isNCR: false,
        });
      }
      for (const mun of province.municipalities) {
        channels.push({
          id: toChannelId(mun),
          name: mun,
          region: region.label,
          province: province.name,
          isNCR: false,
        });
      }
    }
  }

  return channels;
}

/* Global flat list of all channels */
const ALL_CHANNELS = buildAllChannels();

/* Lookup map: channel id → channel object */
const CHANNEL_MAP = Object.fromEntries(ALL_CHANNELS.map((c) => [c.id, c]));
