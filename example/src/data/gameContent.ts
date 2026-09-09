import { StartingLoadout, GameEvent, Temperature, Atmosphere, Gravity, Water, Life, PlanetResources } from '../types';

export const STARTING_LOADOUTS: StartingLoadout[] = [
  {
    id: 'explorer',
    name: 'Explorer Expedition',
    description: 'A fleet optimized for finding new horizons. Equipped with advanced long-range sensors and scouting vessels.',
    bonusResources: {
      science: 30,
      supplies: -10,
      fuel: 10,
      morale: 5,
      hull: 90,
      reputation: 10,
    },
    trait: 'Sensory Suite',
    traitDescription: 'Planet scanning costs 50% fewer supplies and science.',
  },
  {
    id: 'industrial',
    name: 'Industrial Syndicate',
    description: 'Heavy mining and construction fleet. High industrial capabilities, but lacks advanced research tools.',
    bonusResources: {
      industry: 40,
      fuel: 25,
      science: -15,
      supplies: 10,
      morale: -5,
      hull: 100,
    },
    trait: 'Automated Fabrication',
    traitDescription: 'Allows repairing hull integrity using industry instead of supplies.',
  },
  {
    id: 'generation_ship',
    name: 'Generation Ark',
    description: 'A massive colony supercarrier holding thousands of civilian settlers. Extremely high starting crew and morale, but slow and high upkeep.',
    bonusResources: {
      crew: 40,
      supplies: 35,
      fuel: -5,
      morale: 20,
      science: 5,
      industry: 5,
      reputation: 15,
    },
    trait: 'Civilian Populace',
    traitDescription: 'High population allows faster recovery of morale, but upkeeps consume more supplies.',
  },
  {
    id: 'military_escort',
    name: 'Military Escort',
    description: 'A battle-hardened military group protecting a small civilian contingent. Exceptional hull strength and discipline.',
    bonusResources: {
      hull: 50,
      reputation: 30,
      morale: 15,
      industry: 15,
      science: -10,
      crew: -5,
    },
    trait: 'Tactical Discipline',
    traitDescription: 'Reduces all hull and morale damage from hostile encounters by 50%.',
  },
  {
    id: 'research_vessel',
    name: 'Research Vessel',
    description: 'A state-of-the-art scientific laboratory ship. Low initial cargo capacity, but incredible analytical power.',
    bonusResources: {
      science: 60,
      supplies: 5,
      fuel: 5,
      morale: 10,
      industry: -20,
      hull: 80,
    },
    trait: 'Anomaly Matrix',
    traitDescription: 'Gains 100% additional Science points from any scientific discovery or alien artifact event.',
  },
];

export const TEMPERATURES: Temperature[] = ['Frozen', 'Cold', 'Temperate', 'Warm', 'Hot'];
export const ATMOSPHERES: Atmosphere[] = ['None', 'Thin', 'Breathable', 'Dense', 'Toxic'];
export const GRAVITIES: Gravity[] = ['Low', 'Standard', 'High'];
export const WATERS: Water[] = ['None', 'Scarce', 'Moderate', 'Ocean'];
export const LIFES: Life[] = ['None', 'Microbial', 'Primitive', 'Advanced'];
export const RESOURCES_LEVELS: PlanetResources[] = ['Poor', 'Average', 'Rich'];

export const HAZARDS = [
  'Radiation Belts',
  'Toxic Spores',
  'Constant Superstorms',
  'Volcanic Activity',
  'Tidal Locking',
  'Severe Ice Age',
  'Acidic Oceans',
  'Tectonic Instability',
  'Micrometeorite Rain',
  'Carnivorous Flora',
];

export const GAME_EVENTS: GameEvent[] = [
  {
    id: 'deep_space_comet',
    title: 'The Frozen Wanderer',
    category: 'Deep Space',
    description: 'Long-range sensors detect an ice-rich comet drifting through the void. It contains pure frozen water and heavy isotopes, but harvesting it requires a delicate flyby.',
    choices: [
      {
        text: 'Deploy automated miners (Spend 5 Fuel)',
        cost: { fuel: 5 },
        reward: { supplies: 15, industry: 5 },
        rewardText: 'Automated miners successfully secured bulk water ice, which was processed into fresh hydroponic supplies and structural hydrogen.',
      },
      {
        text: 'Sling-shot around and scan it (Gain Science)',
        reward: { science: 15 },
        rewardText: 'A close scientific scan yields deep data on pre-solar nebula compositions. The science division is ecstatic.',
      },
      {
        text: 'Ignore the comet to save resources',
        reward: { morale: -2 },
        rewardText: 'The crew is disappointed at the missed opportunity, but the flight path remains clean and safe.',
      },
    ],
  },
  {
    id: 'arrival_binary',
    title: 'Arrival in Helios Binary',
    category: 'Star System Arrival',
    description: 'We drop out of warp into a system with binary orange dwarf stars. Intense gravity waves make navigation tricky, but the local stellar winds are highly energetic.',
    choices: [
      {
        text: 'Deploy solar scoops to harvest energy',
        reward: { fuel: 20, hull: -5 },
        rewardText: 'Solar scoops gathered massive amounts of raw plasma for hydrogen conversion, though the heat slightly scorched the outer thermal armor.',
      },
      {
        text: 'Perform gravity-assist trajectory calibration',
        reward: { science: 10, fuel: 5 },
        rewardText: 'The navigators mapped the complex gravitational field, generating extra velocity and valuable orbital data.',
      },
    ],
  },
  {
    id: 'distress_beacon',
    title: 'Faint Beacon in the Dark',
    category: 'Distress Signal',
    description: 'A looping radio beacon on an emergency frequency is originating from a dead cargo transport caught in the gravity well of a gas giant.',
    choices: [
      {
        text: 'Launch a boarding crew to rescue survivors',
        cost: { fuel: 5 },
        reward: { crew: 8, supplies: 10, morale: 10 },
        rewardText: 'You rescue several cryo-stasis survivors from the wreckage. They gratefully join your crew, bringing their remaining emergency supplies.',
      },
      {
        text: 'Scavenge the wreck remotely with drone probes',
        reward: { industry: 15, supplies: 5 },
        rewardText: 'Drones strip-mine the steel plating and cargo container walls of the dead freighter, bringing back useful industrial metals.',
      },
      {
        text: 'Ignore the signal to avoid traps',
        reward: { morale: -5, reputation: -10 },
        rewardText: 'The crew murmurs about leaving fellow spacefarers behind. Our reputation for space rescue drops.',
      },
    ],
  },
  {
    id: 'ancient_ruins_obelisk',
    title: 'The Monolith of Delta-9',
    category: 'Ancient Ruins',
    description: 'On a barren rocky moon, a towering black obelisk of alien origin is emitting a high-frequency magnetic hum. It reacts to proximity by lighting up with glowing glyphs.',
    choices: [
      {
        text: 'Attempt to interface with the alien computer (Requires 20 Science)',
        requirement: { resource: 'science', value: 20, failMessage: 'Requires 20 Science to decipher' },
        reward: { science: 30, morale: 10, score: 250 },
        rewardText: 'Using your advanced scientific databases, you translate the monoliths mathematical handshake. It floods your archives with ancient stellar cartography maps!',
      },
      {
        text: 'Excavate and dismantle the obelisk for materials',
        reward: { industry: 20, fuel: 5 },
        rewardText: 'Using heavy machinery, you cut the obelisk into super-conducting alloys, boosting your manufacturing stockpile.',
      },
      {
        text: 'Establish an orbital observation station',
        cost: { supplies: 10 },
        reward: { science: 15, morale: 5 },
        rewardText: 'You set up a permanent beacon. The crew is highly motivated by the confirmation of past intelligent life.',
      },
    ],
  },
  {
    id: 'derelict_cruiser',
    title: 'The Ghost Destroyer',
    category: 'Derelict Ship',
    description: 'A massive military cruiser from an older exploration era floats completely powerless. It bears scars of old weapon impacts. Radiation is leaking from its secondary engines.',
    choices: [
      {
        text: 'Send a professional engineering team (Requires 10 Industry)',
        requirement: { resource: 'industry', value: 10, failMessage: 'Requires 10 Industry' },
        reward: { hull: 20, supplies: 15, score: 200 },
        rewardText: 'Your skilled engineers bypass the security lock, vent the leaking reactor safely, and strip high-grade composite plating to patch our own ship hull.',
      },
      {
        text: 'Siphon remaining antimatter core fuel',
        reward: { fuel: 25, crew: -2 },
        rewardText: 'You successfully draw rich reactor fuel, but an unexpected plasma backflash claims the lives of two technicians.',
      },
      {
        text: 'Blast the wreck apart and harvest scrap',
        reward: { industry: 15 },
        rewardText: 'Your point-defense guns break the derelict into easily harvestable pieces. Standard, risk-free industrial scrap.',
      },
    ],
  },
  {
    id: 'resource_cache_orbital',
    title: 'Pre-Colonist Supply Depot',
    category: 'Resource Cache',
    description: 'You discover a hidden orbital supply depot, left behind by an automated precursor probe. It is sealed with a digital security lock.',
    choices: [
      {
        text: 'Hack the security codes (Requires 15 Science)',
        requirement: { resource: 'science', value: 15, failMessage: 'Requires 15 Science to crack' },
        reward: { supplies: 25, fuel: 15, score: 150 },
        rewardText: 'Your cryptanalysts crack the ancient algorithms. The vault hinges swing open, revealing a treasure trove of pristine food canisters and deuterium fuel cells.',
      },
      {
        text: 'Force the lock using heavy mining lasers (Spend 5 Fuel)',
        cost: { fuel: 5 },
        reward: { supplies: 15, industry: 10 },
        rewardText: 'You cut open the container. Some of the delicate fuel chambers explode, but you salvage plenty of industrial supplies and parts.',
      },
    ],
  },
  {
    id: 'solar_storm_flare',
    title: 'Coronal Mass Ejection',
    category: 'Solar Storm',
    description: 'The local star erupts in a massive Class-X solar flare. A wall of high-energy proton radiation is heading directly toward our coordinates. We have only hours to prepare.',
    choices: [
      {
        text: 'Charge shield generators with extra fuel (Spend 10 Fuel)',
        cost: { fuel: 10 },
        reward: { morale: 5, score: 100 },
        rewardText: 'You dump fuel straight into the magnetic shield coils. The lethal storm deflects harmlessly around our hull. The crew feels incredibly safe under your command.',
      },
      {
        text: 'Retreat the crew to the armored core',
        cost: { supplies: 5 },
        reward: { hull: -15, morale: -5 },
        rewardText: 'The crew is safe but cramped in the inner core. The ship outer structural sensors and solar arrays are badly fried by the solar winds.',
      },
      {
        text: 'Reroute power to structural integrity (Requires 15 Industry)',
        requirement: { resource: 'industry', value: 15, failMessage: 'Requires 15 Industry' },
        reward: { hull: -5, science: 10 },
        rewardText: 'Your engineers rig emergency metal shunts. Structural integrity holds with minor damage, and the scientific instruments capture incredibly valuable radiation data.',
      },
    ],
  },
  {
    id: 'crew_conflict_rationing',
    title: 'The Great Ration Debate',
    category: 'Crew Conflict',
    description: 'Hydroponics output has dipped slightly, causing anxiety. A vocal group of crew members is demanding a larger share of supplies, while others urge strict conservation.',
    choices: [
      {
        text: 'Implement strict, equal rationing (Boost supplies, drop morale)',
        reward: { supplies: 15, morale: -15 },
        rewardText: 'Everyone eats basic nutrient paste. We conserve massive supplies, but the crew is grumpy and morale hits a low point.',
      },
      {
        text: 'Host a grand feast to raise spirits (Spend 10 Supplies)',
        cost: { supplies: 10 },
        reward: { morale: 20 },
        rewardText: 'Fresh food and stellar cocktails are served. The tension evaporates and is replaced by music, hope, and laughter.',
      },
      {
        text: 'Promise future prosperity on the next planet',
        reward: { reputation: 10, morale: -5 },
        rewardText: 'Your eloquent speech wins their trust, but their bellies are still empty. Minor morale drop.',
      },
    ],
  },
  {
    id: 'scientific_discovery_anomaly',
    title: 'Spatial Fold Anomaly',
    category: 'Scientific Discovery',
    description: 'We encounter a pocket of warped space-time. Normal laws of physics seem to distort here. Our scientists are begging for time to launch sensor probes directly into the center.',
    choices: [
      {
        text: 'Launch a full array of science probes (Spend 5 Supplies)',
        cost: { supplies: 5 },
        reward: { science: 35, score: 250 },
        rewardText: 'The probes transmit bizarre quantum mechanics data before collapsing. This discovery breaks several longstanding paradigms in hyperspace warp theory!',
      },
      {
        text: 'Perform a cautious warp-engine diagnostic',
        reward: { fuel: 10, science: 10 },
        rewardText: 'By observing how our warp core interacts with the spatial warping, we optimize our field coils, recovering some fuel-burning efficiency.',
      },
    ],
  },
  {
    id: 'pirate_encounter_blockade',
    title: 'Vagabond Raiders',
    category: 'Pirate Encounter',
    description: 'A group of heavily modified pirate raiders, operating from an asteroid base, has locked their targeting systems onto our ship. They demand a tribute in supplies or they will open fire.',
    choices: [
      {
        text: 'Pay the requested supplies tribute (Spend 15 Supplies)',
        cost: { supplies: 15 },
        reward: { morale: -5, reputation: -10 },
        rewardText: 'The pirates take the supplies and warp away laughing. The crew feels humiliated and our reputation for strength takes a hit.',
      },
      {
        text: 'Engage in defensive maneuvers and fire back',
        reward: { hull: -20, reputation: 15, industry: 10 },
        rewardText: 'You fight them off! Our point defenses shred their lead fighter, causing them to retreat. We scavenge their debris for metal, but our own hull took several heavy missile strikes.',
      },
      {
        text: 'Out-maneuver them using warp drives (Requires 20 Fuel)',
        requirement: { resource: 'fuel', value: 20, failMessage: 'Requires 20 Fuel for emergency jump' },
        reward: { fuel: -10, morale: 10, score: 150 },
        rewardText: 'You execute an immediate, blind micro-warp jump. The raiders are left scanning empty space. The crew cheers for your brilliant piloting.',
      },
    ],
  },
  {
    id: 'alien_artifact_vault',
    title: 'The Cryo-Chamber of the Ancients',
    category: 'Alien Artifact',
    description: 'We discover a small, drifting metallic sarcophagus. Inside, preserved in absolute stasis, is a single non-human biological specimen. It appears to be an ancient alien diplomat or scientist.',
    choices: [
      {
        text: 'Awaken the creature from stasis (Requires 30 Science)',
        requirement: { resource: 'science', value: 30, failMessage: 'Requires 30 Science' },
        reward: { crew: 1, science: 25, reputation: 25, score: 300 },
        rewardText: 'The awakening process is successful! The sentient being communicates telepathically, sharing coordinates of lost sectors and joining our crew as a primary scientific advisor.',
      },
      {
        text: 'Keep the capsule sealed and study it remotely',
        reward: { science: 15, score: 100 },
        rewardText: 'You study the cryo-technology from a safe distance, gaining deep understanding of biological preservation.',
      },
      {
        text: 'Melt the chamber down for precious materials',
        reward: { industry: 25, supplies: 10 },
        rewardText: 'You incinerate the biological entity and melt the container down into heavy transuranic elements, fueling our manufacturing bays.',
      },
    ],
  },
  {
    id: 'equipment_failure_reactor',
    title: 'Magnetic Containment Leak',
    category: 'Equipment Failure',
    description: 'An alarm blares: the secondary antimatter containment fields are degrading rapidly. If they fail completely, a catastrophic explosion will tear through the deck plates.',
    choices: [
      {
        text: 'Sacrifice supplies to seal the leak manually',
        cost: { supplies: 15 },
        reward: { hull: 5 },
        rewardText: 'Engineers use specialized industrial sealing foam and emergency lead panels to encapsulate the leak, saving the ship at the cost of vital materials.',
      },
      {
        text: 'Perform an emergency structural vent (Loses Fuel & Crew)',
        reward: { fuel: -15, crew: -3, hull: -10, morale: -10 },
        rewardText: 'You vent the entire engine compartment into space. The explosion is averted, but the fuel was lost, and several engineers who couldn\'t reach safety were sucked into the vacuum.',
      },
      {
        text: 'Deploy automated repair droids (Requires 20 Industry)',
        requirement: { resource: 'industry', value: 20, failMessage: 'Requires 20 Industry' },
        reward: { hull: -2, score: 150 },
        rewardText: 'Your robotic repair drones execute a high-speed welding operation in the radioactive hot-zone. The leak is stabilized with almost no damage!',
      },
    ],
  },
  {
    id: 'deep_space_gas_cloud',
    title: 'The Nebula Core',
    category: 'Deep Space',
    description: 'We are traversing a dense, glowing nebula. The gas is rich in volatile chemicals, but the static charge is disrupting the ship\'s electrical grids.',
    choices: [
      {
        text: 'Siphon the gas (Gain fuel, risk hull)',
        reward: { fuel: 15, hull: -8 },
        rewardText: 'You harvest chemical fuel, but a static discharges arcs across the auxiliary hull, melting some outer relays.',
      },
      {
        text: 'Deploy dampening fields (Requires 10 Science)',
        requirement: { resource: 'science', value: 10, failMessage: 'Requires 10 Science' },
        reward: { science: 20, morale: 5 },
        rewardText: 'Your dampening coils suppress the static. You gather incredibly detailed readings of nebula particles safely.',
      },
    ],
  },
  {
    id: 'distress_pod',
    title: 'The Stasis Escape Pod',
    category: 'Distress Signal',
    description: 'A tiny pod of human design, centuries old, drifts in deep orbit. Life support is failing, but there is a faint heartbeat inside.',
    choices: [
      {
        text: 'Revive the passenger (Gain Crew)',
        reward: { crew: 3, morale: 10 },
        rewardText: 'You rescue a family of old-earth pioneers. They adjust quickly and are eager to help build our new world.',
      },
      {
        text: 'Examine and salvage the pod technology',
        reward: { science: 10, industry: 10 },
        rewardText: 'The cryo-tech inside, though ancient, has elegant solid-state components that inspire your researchers and mechanics.',
      },
    ],
  },
  {
    id: 'ancient_wreckage_battlefield',
    title: 'The Graveyard of Giants',
    category: 'Ancient Ruins',
    description: 'You enter a sector filled with the skeletal remains of an ancient space battle. Massive dreadnoughts from forgotten species float like iron giants.',
    choices: [
      {
        text: 'Send salvage expeditions to the main flagships (Requires 15 Industry)',
        requirement: { resource: 'industry', value: 15, failMessage: 'Requires 15 Industry' },
        reward: { industry: 30, supplies: 10, score: 200 },
        rewardText: 'Your crew harvests massive bulkheads and weapon systems, converting them into high-yield industrial components.',
      },
      {
        text: 'Scan the database cores for historical records',
        reward: { science: 25, reputation: 10, score: 150 },
        rewardText: 'You download thousands of terabytes of ancient stellar history, learning about the cataclysmic wars that shaped this sector.',
      },
      {
        text: 'Cautiously navigate through the debris field',
        reward: { fuel: 5, morale: 5 },
        rewardText: 'You maneuver safely, harvesting minor stray canisters of gas and boosting crew confidence in your flight control.',
      },
    ],
  }
];
