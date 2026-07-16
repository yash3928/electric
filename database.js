const MOTOR_SIZES = [
  {hp:1, kw:0.75},{hp:2, kw:1.5},{hp:3, kw:2.2},{hp:5, kw:3.7},{hp:7.5, kw:5.5},
  {hp:10, kw:7.5},{hp:15, kw:11},{hp:20, kw:15},{hp:25, kw:18.5},{hp:30, kw:22},
  {hp:40, kw:30},{hp:50, kw:37},{hp:60, kw:45},{hp:75, kw:55},{hp:100, kw:75}
];

const BREAKER_RATINGS = [5,10,15,20,30,40,50,60,75,100,125,150,175,200,225,250,300,350,400];
const BREAKER_FRAMES = [
  {max:30, frame:30},{max:60, frame:60},{max:100, frame:100},{max:225, frame:225},{max:400, frame:400}
];

// 실무 간편 CV 케이블 허용전류 DB. 실제 적용 전 KEC 포설조건/보정계수로 재검토.
const CABLES = [
  {sq:2.5, iz:28, terminal:'2.5SQ-4mm', cableOD:13.5},
  {sq:4, iz:37, terminal:'4SQ-5mm', cableOD:15.2},
  {sq:6, iz:47, terminal:'6SQ-5mm', cableOD:17.0},
  {sq:10, iz:65, terminal:'10SQ-6mm', cableOD:20.5},
  {sq:16, iz:87, terminal:'16SQ-8mm', cableOD:24.0},
  {sq:25, iz:115, terminal:'25SQ-8mm', cableOD:29.0},
  {sq:35, iz:142, terminal:'35SQ-8mm', cableOD:33.0},
  {sq:50, iz:175, terminal:'50SQ-10mm', cableOD:39.0},
  {sq:70, iz:220, terminal:'70SQ-10mm', cableOD:45.0},
  {sq:95, iz:270, terminal:'95SQ-12mm', cableOD:52.0}
];

const CONDUIT_ACCESSORIES = {
  CD: {
    name:'CD관',
    sizes:[16,22,28,36,42,54],
    fittings:(s)=>({connector:`CD${s} 커넥터`, insert:`CD${s} 인서트`, saddle:`CD${s} 새들`, note:'실내 매입/은폐 배관용 간편 추천'})
  },
  GW: {
    name:'GW 방수후렉시블관',
    sizes:[16,22,28,36,42,54],
    fittings:(s)=>({connector:`GW${s} 방수커넥터`, insert:`GW${s} 로크너트/부싱`, saddle:`GW${s} 새들`, note:'옥외·습기·기계 진동부 접속용 간편 추천'})
  }
};

const HOLE_CUTTERS = {
  16:'22mm', 22:'28mm', 28:'35mm', 36:'45mm', 42:'51mm', 54:'65mm'
};

const LOCATION_RULES = {
  indoorHidden:{label:'실내 매입/은폐', conduitType:'CD'},
  indoorExposed:{label:'실내 노출/기계 주변', conduitType:'GW'},
  outdoorWet:{label:'옥외/습기 우려', conduitType:'GW'}
};

// 케이블 굵기별 터미널 간편 DB.
// 혼동 방지를 위해 웹페이지에는 대표 추천 1개만 표시합니다.
// 표기는 현장 구매 편의를 위해 SQ-mm 형식으로 통일합니다.
const CABLE_ACCESSORY_DB = [
  {sq:1.5, terminal:'1.5SQ-4mm'},
  {sq:2.5, terminal:'2.5SQ-4mm'},
  {sq:4, terminal:'4SQ-5mm'},
  {sq:6, terminal:'6SQ-5mm'},
  {sq:10, terminal:'10SQ-6mm'},
  {sq:16, terminal:'16SQ-8mm'},
  {sq:25, terminal:'25SQ-8mm'},
  {sq:35, terminal:'35SQ-8mm'},
  {sq:50, terminal:'50SQ-10mm'},
  {sq:70, terminal:'70SQ-10mm'},
  {sq:95, terminal:'95SQ-12mm'}
];

const CABLE_TYPE_INFO = {
  CV_4C:{label:'CV 4C', cores:'4심', note:'삼상 모터/동력 부하에 주로 사용'},
  CV_3C:{label:'CV 3C', cores:'3심', note:'3선식 동력/단상 회로 등 현장 조건에 따라 사용'},
  CV_2C:{label:'CV 2C', cores:'2심', note:'단상 2선식 부하에 주로 사용'},
  HIV_SINGLE:{label:'HIV/IV 단심', cores:'단심', note:'제어반 내부 배선 또는 전선관 내 절연전선용'}
};

const TERMINAL_BLOCK_DB = [
  {amp:15, cableRange:'1.25~2.5SQ', minSq:1.5, maxSq:2.5, defaultSq:2.5, holes:[3.5,4], note:'소형 제어/전원 단자대'},
  {amp:20, cableRange:'1.5~4SQ', minSq:1.5, maxSq:4, defaultSq:2.5, holes:[4,5], note:'소형 동력·제어 전원 단자대'},
  {amp:30, cableRange:'2.5~6SQ', minSq:2.5, maxSq:6, defaultSq:4, holes:[4,5,6], note:'30A 4P 단자대는 2.5~6SQ급 접속에 주로 사용'},
  {amp:60, cableRange:'6~16SQ', minSq:6, maxSq:16, defaultSq:10, holes:[5,6,8], note:'중소형 동력 회로 분기용'},
  {amp:100, cableRange:'16~25SQ', minSq:16, maxSq:25, defaultSq:16, holes:[6,8,10], note:'동력 회로 및 분전반 내부 배선용'},
  {amp:150, cableRange:'25~35SQ', minSq:25, maxSq:35, defaultSq:35, holes:[8,10], note:'대용량 동력 회로용'},
  {amp:200, cableRange:'35~60SQ', minSq:35, maxSq:60, defaultSq:50, holes:[8,10,12], note:'200A 4P 단자대는 35~60SQ급 접속에 주로 사용'},
  {amp:300, cableRange:'60~95SQ', minSq:60, maxSq:95, defaultSq:70, holes:[10,12,14], note:'대용량 간선 접속용'}
];

// KEPCO 전기요금 간편 DB (공식 요금표 기준, 일부 주요 계약종별만 탑재)
// 단위: 기본요금 원/kW, 전력량요금 원/kWh
// season keys: summer, springAutumn, winter. load keys: light, mid, peak.
// KEPCO 전기요금 DB
// 기준: 2026년 6월 1일 시행 전기요금표(종합) PDF 반영
// 단위: 기본요금 원/kW, 전력량요금 원/kWh
// season keys: summer(6~8월), springAutumn(3~5월, 9~10월), winter(11~2월)
// load keys: light(경부하), mid(중간부하), peak(최대부하)
const TARIFF_VERSION = '2026-06-01';
const TARIFFS = [
  // 일반용전력(갑)Ⅰ - 계약전력 300kW 미만, 단일요금
  {id:'general_a1_low', label:'일반용(갑)Ⅰ 저압', type:'flat', basic:6160, energy:{summer:132.4, springAutumn:91.9, winter:119.0}, note:'계약전력 300kW 미만'},
  {id:'general_a1_highA_1', label:'일반용(갑)Ⅰ 고압A 선택Ⅰ', type:'flat', basic:7170, energy:{summer:142.6, springAutumn:98.6, winter:130.3}, note:'계약전력 300kW 미만'},
  {id:'general_a1_highA_2', label:'일반용(갑)Ⅰ 고압A 선택Ⅱ', type:'flat', basic:8230, energy:{summer:138.6, springAutumn:94.3, winter:125.0}, note:'계약전력 300kW 미만'},
  {id:'general_a1_highB_1', label:'일반용(갑)Ⅰ 고압B 선택Ⅰ', type:'flat', basic:7170, energy:{summer:140.5, springAutumn:97.5, winter:127.3}, note:'계약전력 300kW 미만'},
  {id:'general_a1_highB_2', label:'일반용(갑)Ⅰ 고압B 선택Ⅱ', type:'flat', basic:8230, energy:{summer:135.2, springAutumn:92.2, winter:122.0}, note:'계약전력 300kW 미만'},

  // 일반용전력(갑)Ⅱ - 계약전력 300kW 미만 시간대별 구분계량기 설치고객
  {id:'general_a2_highA_1', label:'일반용(갑)Ⅱ 고압A 선택Ⅰ', type:'tou', basic:7170, energy:{summer:{light:89.4, mid:140.6, peak:163.1}, springAutumn:{light:89.4, mid:96.8, peak:108.1}, winter:{light:98.1, mid:128.5, peak:143.3}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'general_a2_highA_2', label:'일반용(갑)Ⅱ 고압A 선택Ⅱ', type:'tou', basic:8230, energy:{summer:{light:84.1, mid:135.3, peak:157.8}, springAutumn:{light:84.1, mid:91.5, peak:102.8}, winter:{light:92.8, mid:123.2, peak:138.0}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'general_a2_highB_1', label:'일반용(갑)Ⅱ 고압B 선택Ⅰ', type:'tou', basic:7170, energy:{summer:{light:88.8, mid:137.4, peak:153.8}, springAutumn:{light:88.8, mid:94.7, peak:100.1}, winter:{light:97.8, mid:125.1, peak:139.3}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'general_a2_highB_2', label:'일반용(갑)Ⅱ 고압B 선택Ⅱ', type:'tou', basic:8230, energy:{summer:{light:83.5, mid:132.1, peak:148.5}, springAutumn:{light:83.5, mid:89.4, peak:94.8}, winter:{light:92.5, mid:119.8, peak:134.0}}, note:'계약전력 300kW 미만 시간대별'},

  // 일반용전력(을) - 계약전력 300kW 이상
  {id:'general_b_highA_1', label:'일반용(을) 고압A 선택Ⅰ', type:'tou', basic:7220, energy:{summer:{light:92.8, mid:145.7, peak:227.8}, springAutumn:{light:92.8, mid:115.3, peak:146.0}, winter:{light:99.8, mid:145.9, peak:203.4}}, note:'계약전력 300kW 이상'},
  {id:'general_b_highA_2', label:'일반용(을) 고압A 선택Ⅱ', type:'tou', basic:8320, energy:{summer:{light:87.3, mid:140.2, peak:222.3}, springAutumn:{light:87.3, mid:109.8, peak:140.5}, winter:{light:94.3, mid:140.4, peak:197.9}}, note:'계약전력 300kW 이상'},
  {id:'general_b_highA_3', label:'일반용(을) 고압A 선택Ⅲ', type:'tou', basic:9810, energy:{summer:{light:86.4, mid:139.6, peak:209.9}, springAutumn:{light:86.4, mid:108.5, peak:132.2}, winter:{light:93.7, mid:139.8, peak:186.7}}, note:'계약전력 300kW 이상'},
  {id:'general_b_highB_1', label:'일반용(을) 고압B 선택Ⅰ', type:'tou', basic:6630, energy:{summer:{light:95.9, mid:148.2, peak:229.4}, springAutumn:{light:95.9, mid:118.2, peak:148.5}, winter:{light:102.9, mid:148.2, peak:204.4}}, note:'계약전력 300kW 이상'},
  {id:'general_b_highB_2', label:'일반용(을) 고압B 선택Ⅱ', type:'tou', basic:7380, energy:{summer:{light:92.1, mid:144.4, peak:225.6}, springAutumn:{light:92.1, mid:114.4, peak:144.7}, winter:{light:99.1, mid:144.4, peak:200.6}}, note:'계약전력 300kW 이상'},
  {id:'general_b_highB_3', label:'일반용(을) 고압B 선택Ⅲ', type:'tou', basic:8190, energy:{summer:{light:90.4, mid:142.7, peak:224.0}, springAutumn:{light:90.4, mid:112.8, peak:143.1}, winter:{light:97.5, mid:142.7, peak:198.9}}, note:'계약전력 300kW 이상'},

  // 산업용전력(갑)Ⅰ - 계약전력 300kW 미만, 단일요금
  {id:'industrial_a1_low', label:'산업용(갑)Ⅰ 저압', type:'flat', basic:5550, energy:{summer:116.2, springAutumn:94.4, winter:114.5}, note:'계약전력 300kW 미만'},
  {id:'industrial_a1_highA_1', label:'산업용(갑)Ⅰ 고압A 선택Ⅰ', type:'flat', basic:6490, energy:{summer:124.8, springAutumn:101.1, winter:124.7}, note:'계약전력 300kW 미만'},
  {id:'industrial_a1_highA_2', label:'산업용(갑)Ⅰ 고압A 선택Ⅱ', type:'flat', basic:7470, energy:{summer:120.0, springAutumn:96.5, winter:118.2}, note:'계약전력 300kW 미만'},
  {id:'industrial_a1_highB_1', label:'산업용(갑)Ⅰ 고압B 선택Ⅰ', type:'flat', basic:6000, energy:{summer:123.6, springAutumn:100.0, winter:123.2}, note:'계약전력 300kW 미만'},
  {id:'industrial_a1_highB_2', label:'산업용(갑)Ⅰ 고압B 선택Ⅱ', type:'flat', basic:6900, energy:{summer:118.9, springAutumn:95.4, winter:117.1}, note:'계약전력 300kW 미만'},

  // 산업용전력(갑)Ⅱ - 계약전력 300kW 미만 시간대별 구분계량기 설치고객
  {id:'industrial_a2_highA_1', label:'산업용(갑)Ⅱ 고압A 선택Ⅰ', type:'tou', basic:6490, energy:{summer:{light:95.7, mid:121.5, peak:155.0}, springAutumn:{light:95.7, mid:100.5, peak:119.7}, winter:{light:103.1, mid:120.0, peak:149.4}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'industrial_a2_highA_2', label:'산업용(갑)Ⅱ 고압A 선택Ⅱ', type:'tou', basic:7470, energy:{summer:{light:90.8, mid:116.6, peak:150.1}, springAutumn:{light:90.8, mid:95.6, peak:114.8}, winter:{light:98.2, mid:115.1, peak:144.5}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'industrial_a2_highB_1', label:'산업용(갑)Ⅱ 고압B 선택Ⅰ', type:'tou', basic:6000, energy:{summer:{light:92.5, mid:120.1, peak:153.9}, springAutumn:{light:92.5, mid:99.1, peak:117.9}, winter:{light:99.7, mid:117.7, peak:146.4}}, note:'계약전력 300kW 미만 시간대별'},
  {id:'industrial_a2_highB_2', label:'산업용(갑)Ⅱ 고압B 선택Ⅱ', type:'tou', basic:6900, energy:{summer:{light:88.0, mid:115.6, peak:149.4}, springAutumn:{light:88.0, mid:94.6, peak:113.4}, winter:{light:95.2, mid:113.2, peak:141.9}}, note:'계약전력 300kW 미만 시간대별'},

  // 산업용전력(을) - 계약전력 300kW 이상
  {id:'industrial_b_highA_1', label:'산업용(을) 고압A 선택Ⅰ', type:'tou', basic:7220, energy:{summer:{light:121.5, mid:169.3, peak:234.5}, springAutumn:{light:121.5, mid:138.9, peak:156.4}, winter:{light:128.5, mid:169.5, peak:210.1}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highA_2', label:'산업용(을) 고압A 선택Ⅱ', type:'tou', basic:8320, energy:{summer:{light:116.0, mid:163.8, peak:229.0}, springAutumn:{light:116.0, mid:133.4, peak:150.9}, winter:{light:123.0, mid:164.0, peak:204.6}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highA_3', label:'산업용(을) 고압A 선택Ⅲ', type:'tou', basic:9810, energy:{summer:{light:115.1, mid:163.2, peak:216.6}, springAutumn:{light:115.1, mid:132.1, peak:142.6}, winter:{light:122.4, mid:163.4, peak:193.4}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highB_1', label:'산업용(을) 고압B 선택Ⅰ', type:'tou', basic:6630, energy:{summer:{light:131.4, mid:178.6, peak:242.9}, springAutumn:{light:131.4, mid:148.6, peak:165.7}, winter:{light:138.4, mid:178.6, peak:217.9}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highB_2', label:'산업용(을) 고압B 선택Ⅱ', type:'tou', basic:7380, energy:{summer:{light:127.6, mid:174.8, peak:239.1}, springAutumn:{light:127.6, mid:144.8, peak:161.9}, winter:{light:134.6, mid:174.8, peak:214.1}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highB_3', label:'산업용(을) 고압B 선택Ⅲ', type:'tou', basic:8190, energy:{summer:{light:125.9, mid:173.1, peak:237.5}, springAutumn:{light:125.9, mid:143.2, peak:160.3}, winter:{light:133.0, mid:173.1, peak:212.4}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highC_1', label:'산업용(을) 고압C 선택Ⅰ', type:'tou', basic:6590, energy:{summer:{light:130.9, mid:178.7, peak:242.7}, springAutumn:{light:130.9, mid:148.7, peak:165.9}, winter:{light:137.8, mid:178.3, peak:218.0}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highC_2', label:'산업용(을) 고압C 선택Ⅱ', type:'tou', basic:7520, energy:{summer:{light:126.2, mid:174.0, peak:238.0}, springAutumn:{light:126.2, mid:144.0, peak:161.2}, winter:{light:133.1, mid:173.6, peak:213.3}}, note:'계약전력 300kW 이상'},
  {id:'industrial_b_highC_3', label:'산업용(을) 고압C 선택Ⅲ', type:'tou', basic:8090, energy:{summer:{light:125.1, mid:172.9, peak:236.9}, springAutumn:{light:125.1, mid:142.9, peak:160.1}, winter:{light:132.0, mid:172.5, peak:212.2}}, note:'계약전력 300kW 이상'},

  {id:'manual', label:'직접입력', type:'flat', basic:0, energy:{summer:0, springAutumn:0, winter:0}, note:'직접 단가를 입력합니다.'}
];
