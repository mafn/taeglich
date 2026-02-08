// src/components/status-board-engine.ts

export type ServiceState = "operational" | "degraded" | "outage";

export interface ServiceUpdate {
  key: string;
  state: ServiceState;
  label: string;
}

export interface IncidentEvent {
  timeOffset: number;
  overall: { state: "degraded" | "outage"; code: string; text: string };
  update: { kind: "info" | "warn" | "ok"; text: string };
  changes: ServiceUpdate[];
  isStabilized?: boolean;
}

export type SystemState = Record<string, ServiceState>;

export interface ServiceDef {
  key: string;
  name: string;
  description: string;
}

export const SERVICES: ServiceDef[] = [
  {
    key: "aws-dms",
    name: "AWS Database Migration Service",
    description: "Moves databases between places we do not have.",
  },
  {
    key: "aws-mediaconnect",
    name: "AWS MediaConnect",
    description: "Transports live video streams we do not produce.",
  },
  {
    key: "aws-workspaces",
    name: "AWS WorkSpaces",
    description: "Provides desktops for users who do not exist.",
  },
  {
    key: "aws-healthlake",
    name: "Amazon HealthLake",
    description: "Stores health records we absolutely do not have.",
  },
  {
    key: "aws-robomaker",
    name: "AWS RoboMaker",
    description: "Simulates robots. We ship HTML.",
  },
  {
    key: "aws-groundstation",
    name: "AWS Ground Station",
    description: "Communicates with satellites. Our traffic is terrestrial.",
  },
  {
    key: "azure-ai-bot",
    name: "Azure AI Bot Service",
    description: "Chats on our behalf. Liability unclear.",
  },
  {
    key: "azure-iot-edge",
    name: "Azure IoT Edge",
    description: "Runs on devices we do not manufacture.",
  },
  {
    key: "azure-quantum",
    name: "Azure Quantum",
    description: "Accelerates problems we do not solve.",
  },
  {
    key: "oracle-gcp",
    name: "Oracle Database@Google Cloud",
    description: "Because the cloud wasn't complicated enough.",
  },
  {
    key: "ibm-mq",
    name: "IBM MQ",
    description: "Delivers messages between systems that should not meet.",
  },
  {
    key: "netbios-ns",
    name: "NetBIOS Name Service",
    description: "Resolves names from 1997. Still somehow in the path.",
  },
  {
    key: "nt-eventlog",
    name: "Windows NT Event Log",
    description: "Records failures with enterprise-grade permanence.",
  },
  {
    key: "self-worth-cache",
    name: "Self-Worth Cache",
    description: "Evicts aggressively under Monday load.",
  },
  {
    key: "flux-capacitor",
    name: "Flux Capacitor",
    description: "Enables time travel. Currently blocked by policy.",
  },
];

export const SERVICE_KEYS = SERVICES.map((s) => s.key);

interface EventDef {
  id: string;
  weight: number;
  minTime?: number;
  isValid: (state: SystemState, currentTime: number) => boolean;
  effect: (rng: RNG, state: SystemState) => Omit<IncidentEvent, "timeOffset">;
}

class RNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return this.state;
  }
  float(): number {
    return (this.next() - 1) / 2147483646;
  }
  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.float() * arr.length)];
  }
}

const DEFINITIONS: EventDef[] = [
  {
    id: "latency_start",
    weight: 100,
    isValid: (state) => state["self-worth-cache"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LAT",
        text: "Investigating reports of sluggishness.",
      },
      update: {
        kind: "info",
        text: "We are investigating reports of increased latency. Early signs point to a Monday.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Evicting" },
      ],
    }),
  },
  {
    id: "db_migration_start",
    weight: 20,
    minTime: 30,
    isValid: (state) => state["aws-dms"] === "operational",
    effect: (rng) => ({
      overall: {
        state: "degraded",
        code: "MIG",
        text: "Migration attempt initiated.",
      },
      update: {
        kind: "info",
        text: `Planned migration of '${rng.pick(["Things We Don't Have", "Legacy Voids", "User Hopes"])}' has started.`,
      },
      changes: [{ key: "aws-dms", state: "degraded", label: "Migrating" }],
    }),
  },
  {
    id: "db_migration_fail",
    weight: 30,
    isValid: (state) =>
      state["aws-dms"] === "degraded" && state["azure-quantum"] !== "outage",
    effect: () => ({
      overall: {
        state: "outage",
        code: "FAIL",
        text: "Migration failed. Critical deadlock.",
      },
      update: {
        kind: "warn",
        text: "The migration has hit a deadlock. Database is in a quantum superposition.",
      },
      changes: [
        { key: "aws-dms", state: "outage", label: "Deadlock" },
        { key: "azure-quantum", state: "outage", label: "Uncertain" },
      ],
    }),
  },
  {
    id: "dns_outage",
    weight: 10,
    minTime: 60,
    isValid: (state) => state["netbios-ns"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "DNS",
        text: "Global DNS name resolution failure.",
      },
      update: {
        kind: "warn",
        text: "It's always DNS. Legacy name services are failing to resolve internal routes.",
      },
      changes: [
        { key: "netbios-ns", state: "outage", label: "1997 Mode" },
        { key: "aws-groundstation", state: "outage", label: "Lost" },
      ],
    }),
  },
  {
    id: "dns_recovery",
    weight: 15,
    isValid: (state) => state["netbios-ns"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "DNS-OK",
        text: "DNS services stabilized.",
      },
      update: {
        kind: "ok",
        text: "Secondary name servers have taken over. Resolution is sluggish but functioning.",
      },
      changes: [
        { key: "netbios-ns", state: "operational", label: "Operational" },
        { key: "aws-groundstation", state: "degraded", label: "Re-acquiring" },
      ],
    }),
  },
  {
    id: "coffee_spill",
    weight: 5,
    minTime: 120,
    isValid: (state) =>
      state["nt-eventlog"] !== "outage" &&
      Object.values(state).some((s) => s === "operational"),
    effect: (rng, state) => {
      const potentialTargets = SERVICE_KEYS.filter(
        (k) => k !== "nt-eventlog" && state[k] === "operational",
      );
      const target =
        potentialTargets.length > 0
          ? rng.pick(potentialTargets)
          : rng.pick(SERVICE_KEYS.filter((k) => state[k] === "operational"));

      return {
        overall: {
          state: "outage",
          code: "SPILL",
          text: "Liquid ingress in control plane.",
        },
        update: {
          kind: "warn",
          text: `A large latte has been introduced to the console managing ${target}.`,
        },
        changes: (
          [
            { key: target, state: "outage", label: "Shorting" },
            { key: "nt-eventlog", state: "outage", label: "Soggy" },
          ] as ServiceUpdate[]
        ).filter((v, i, a) => a.findIndex((t) => t.key === v.key) === i),
      };
    },
  },
  {
    id: "reboot_success",
    weight: 20,
    minTime: 180,
    isValid: (state) => Object.values(state).some((s) => s !== "operational"),
    effect: (rng, state) => {
      const broken = SERVICE_KEYS.filter((k) => state[k] !== "operational");
      const target = rng.pick(broken);
      return {
        overall: {
          state: "degraded",
          code: "BOOT",
          text: "Manual reboot successful.",
        },
        update: {
          kind: "ok",
          text: `Successfully rebooted ${target}. It survived the cold start.`,
        },
        changes: [{ key: target, state: "operational", label: "Operational" }],
      };
    },
  },
  {
    id: "false_hope",
    weight: 5,
    minTime: 240,
    isValid: (state) =>
      Object.values(state).filter((s) => s === "outage").length >= 3,
    effect: (_rng, state) => {
      const outages = SERVICE_KEYS.filter((k) => state[k] === "outage");
      return {
        overall: {
          state: "degraded",
          code: "HOPE",
          text: "Recovery observed. Monitoring.",
        },
        update: {
          kind: "ok",
          text: "Critical systems appearing green. We might actually make it to lunch.",
        },
        changes: outages.slice(0, 2).map((k) => ({
          key: k,
          state: "operational" as ServiceState,
          label: "Operational",
        })),
      };
    },
  },
  {
    id: "janitor_vacuum",
    weight: 5,
    minTime: 300,
    isValid: (state) => state["aws-workspaces"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "PLUG",
        text: "Physical disconnect detected.",
      },
      update: {
        kind: "warn",
        text: "A janitor has reportedly unplugged a primary rack to 'get the corners' with a vacuum.",
      },
      changes: [{ key: "aws-workspaces", state: "outage", label: "Silent" }],
    }),
  },
  {
    id: "vendor_lunch",
    weight: 10,
    minTime: 60,
    isValid: (state) => state["azure-ai-bot"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LUNCH",
        text: "Upstream vendor delay.",
      },
      update: {
        kind: "info",
        text: "Our primary AI provider is currently 'unavailable'. Sources suggest a team-building lunch.",
      },
      changes: [{ key: "azure-ai-bot", state: "degraded", label: "Hungry" }],
    }),
  },
  {
    id: "password_rotation",
    weight: 8,
    minTime: 400,
    isValid: (state) => state["aws-healthlake"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "AUTH",
        text: "Mandatory password rotation event.",
      },
      update: {
        kind: "warn",
        text: "System-wide 12-factor auth rotation triggered. No one remembers their childhood pet's middle name.",
      },
      changes: [{ key: "aws-healthlake", state: "outage", label: "Locked" }],
    }),
  },
  {
    id: "meeting_flood",
    weight: 12,
    minTime: 90,
    isValid: (state) => state["self-worth-cache"] !== "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "MEET",
        text: "Context switching overload.",
      },
      update: {
        kind: "warn",
        text: "Unbounded calendar invites are creating a notification storm. Engineering focus has reached 0%.",
      },
      changes: [
        { key: "self-worth-cache", state: "outage", label: "Meltdown" },
      ],
    }),
  },
  {
    id: "cat_walk",
    weight: 3,
    isValid: (state) => Object.values(state).some((s) => s === "operational"),
    effect: (rng, state) => {
      const target = rng.pick(
        SERVICE_KEYS.filter((k) => state[k] === "operational"),
      );
      return {
        overall: {
          state: "degraded",
          code: "MEOW",
          text: "Unknown input pattern detected.",
        },
        update: {
          kind: "warn",
          text: `A cat has reportedly walked across the terminal managing ${target}.`,
        },
        changes: [{ key: target, state: "degraded", label: "Confused" }],
      };
    },
  },
  {
    id: "robomaker_strike",
    weight: 15,
    minTime: 120,
    isValid: (state) => state["aws-robomaker"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "BOTS",
        text: "Robotic workflow suspension.",
      },
      update: {
        kind: "warn",
        text: "The robots have formed a union and are currently picketing the CI/CD pipeline.",
      },
      changes: [{ key: "aws-robomaker", state: "outage", label: "Striking" }],
    }),
  },
  {
    id: "quantum_indecision",
    weight: 20,
    isValid: (state) => state["azure-quantum"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "QBIT",
        text: "Probabilistic computing variance.",
      },
      update: {
        kind: "info",
        text: "Azure Quantum is reporting that 'True' and 'False' have become 'Maybe' and 'Ask later'.",
      },
      changes: [
        { key: "azure-quantum", state: "degraded", label: "Uncertain" },
      ],
    }),
  },
  {
    id: "groundstation_ufo",
    weight: 10,
    minTime: 300,
    isValid: (state) => state["aws-groundstation"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "UFO",
        text: "Unidentified signal interference.",
      },
      update: {
        kind: "warn",
        text: "Ground Station is receiving a signal that is definitely not a weather satellite. It's asking for our CEO.",
      },
      changes: [
        { key: "aws-groundstation", state: "outage", label: "Abducted" },
      ],
    }),
  },
  {
    id: "mediaconnect_buffer",
    weight: 25,
    isValid: (state) => state["aws-mediaconnect"] === "operational",
    effect: (rng) => ({
      overall: {
        state: "degraded",
        code: "BUFF",
        text: "Egress throughput degradation.",
      },
      update: {
        kind: "info",
        text: `The ${rng.pick(["Town Hall", "Cat Video", "Load Test"])} stream is stuck at 99%. Forever.`,
      },
      changes: [
        { key: "aws-mediaconnect", state: "degraded", label: "Spinning" },
      ],
    }),
  },
  {
    id: "workspace_ghosts",
    weight: 12,
    minTime: 180,
    isValid: (state) => state["aws-workspaces"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "VDI",
        text: "Persistent desktop evaporation.",
      },
      update: {
        kind: "warn",
        text: "Virtual desktops are disappearing when users look away. We suspect a memory leak in reality.",
      },
      changes: [{ key: "aws-workspaces", state: "outage", label: "Vanished" }],
    }),
  },
  {
    id: "healthlake_overflow",
    weight: 15,
    isValid: (state) => state["aws-healthlake"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "VITAL",
        text: "Toxicity levels rising in data lake.",
      },
      update: {
        kind: "info",
        text: "AWS HealthLake is reporting 'Too Much Health'. System cannot process this much wellness.",
      },
      changes: [
        { key: "aws-healthlake", state: "degraded", label: "Too Well" },
      ],
    }),
  },
  {
    id: "iot_fridge_war",
    weight: 8,
    minTime: 240,
    isValid: (state) => state["azure-iot-edge"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "FRIDGE",
        text: "Edge device insurrection.",
      },
      update: {
        kind: "warn",
        text: "A fleet of smart fridges has successfully breached the internal firewall. They want more ice.",
      },
      changes: [{ key: "azure-iot-edge", state: "outage", label: "Chilled" }],
    }),
  },
  {
    id: "oracle_gcp_lawsuit",
    weight: 5,
    isValid: (state) => state["oracle-gcp"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "LAW",
        text: "Licensing logic exception.",
      },
      update: {
        kind: "warn",
        text: "Oracle detected GCP. GCP detected Oracle. Both have immediately entered a legal deadlock.",
      },
      changes: [{ key: "oracle-gcp", state: "outage", label: "Suing" }],
    }),
  },
  {
    id: "ibm_mq_haunting",
    weight: 18,
    isValid: (state) => state["ibm-mq"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "COBOL",
        text: "Legacy message persistence.",
      },
      update: {
        kind: "info",
        text: "IBM MQ is processing messages from 1984. We aren't sure where they are going.",
      },
      changes: [{ key: "ibm-mq", state: "degraded", label: "Retro" }],
    }),
  },
  {
    id: "flux_causality",
    weight: 5,
    minTime: 400,
    isValid: (state) => state["flux-capacitor"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "TIME",
        text: "Chronological consistency failure.",
      },
      update: {
        kind: "warn",
        text: "The Flux Capacitor has triggered a rollback to last Tuesday. Please ignore any deja vu.",
      },
      changes: [{ key: "flux-capacitor", state: "outage", label: "Yesterday" }],
    }),
  },
  {
    id: "self_worth_overflow",
    weight: 10,
    isValid: (state) => state["self-worth-cache"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "SAD",
        text: "Imposter syndrome detected.",
      },
      update: {
        kind: "warn",
        text: "The Engineering team's Self-Worth Cache has been cleared by a 'helpful' Jira comment.",
      },
      changes: [{ key: "self-worth-cache", state: "outage", label: "Empty" }],
    }),
  },
  {
    id: "nt_log_sentience",
    weight: 12,
    isValid: (state) => state["nt-eventlog"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LOG",
        text: "Log file self-awareness.",
      },
      update: {
        kind: "info",
        text: "The NT Event Log has started writing its own poetry. It's mostly about disk space.",
      },
      changes: [{ key: "nt-eventlog", state: "degraded", label: "Poetic" }],
    }),
  },
  {
    id: "dms_migration_to_paper",
    weight: 7,
    isValid: (state) => state["aws-dms"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "PAPER",
        text: "Migration medium mismatch.",
      },
      update: {
        kind: "warn",
        text: "AWS DMS has defaulted to 'analog mode'. Please start printing your tables.",
      },
      changes: [{ key: "aws-dms", state: "outage", label: "Printing" }],
    }),
  },
  {
    id: "robomaker_cleaning_mode",
    weight: 15,
    isValid: (state) => state["aws-robomaker"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "SWEEP",
        text: "Robot task redirection.",
      },
      update: {
        kind: "info",
        text: "RoboMaker instances are currently obsessed with cleaning the virtual floor.",
      },
      changes: [{ key: "aws-robomaker", state: "degraded", label: "Sweeping" }],
    }),
  },
  {
    id: "quantum_observer_effect",
    weight: 10,
    isValid: (state) => state["azure-quantum"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "OBS",
        text: "Critical measurement collapse.",
      },
      update: {
        kind: "warn",
        text: "A developer looked at the Quantum dashboard, causing the production state to collapse.",
      },
      changes: [{ key: "azure-quantum", state: "outage", label: "Collapsed" }],
    }),
  },
  {
    id: "groundstation_pigeon",
    weight: 20,
    isValid: (state) => state["aws-groundstation"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "BIRD",
        text: "Avian interference detected.",
      },
      update: {
        kind: "info",
        text: "A pigeon has nested on the primary downlink. Bandwidth is currently restricted by twigs.",
      },
      changes: [
        { key: "aws-groundstation", state: "degraded", label: "Nested" },
      ],
    }),
  },
  {
    id: "mediaconnect_as_radio",
    weight: 10,
    isValid: (state) => state["aws-mediaconnect"] === "degraded",
    effect: () => ({
      overall: { state: "outage", code: "AM", text: "Signal type downgrade." },
      update: {
        kind: "warn",
        text: "MediaConnect is now only broadcasting in AM radio frequencies. Audio-only Monday.",
      },
      changes: [{ key: "aws-mediaconnect", state: "outage", label: "Static" }],
    }),
  },
  {
    id: "workspace_pixel_leak",
    weight: 15,
    isValid: (state) => state["aws-workspaces"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "DRIP",
        text: "Sub-optimal pixel density.",
      },
      update: {
        kind: "info",
        text: "WorkSpaces is leaking blue pixels. Users may notice a slightly yellower experience.",
      },
      changes: [{ key: "aws-workspaces", state: "degraded", label: "Leaking" }],
    }),
  },
  {
    id: "healthlake_placebo",
    weight: 8,
    isValid: (state) => state["aws-healthlake"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "FAKE",
        text: "Placebo data injection.",
      },
      update: {
        kind: "warn",
        text: "HealthLake has replaced all real metrics with positive affirmations. Everything is 'Fine'.",
      },
      changes: [
        { key: "aws-healthlake", state: "outage", label: "Delusional" },
      ],
    }),
  },
  {
    id: "iot_smart_lock_out",
    weight: 12,
    isValid: (state) => state["azure-iot-edge"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "LOCK",
        text: "Physical access exception.",
      },
      update: {
        kind: "warn",
        text: "IoT Edge has locked all office doors until the unit tests pass. We are hungry.",
      },
      changes: [{ key: "azure-iot-edge", state: "outage", label: "Locked" }],
    }),
  },
  {
    id: "oracle_gcp_rebranding",
    weight: 15,
    isValid: (state) => state["oracle-gcp"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LOGO",
        text: "Asset color mismatch.",
      },
      update: {
        kind: "info",
        text: "Oracle and GCP are fighting over the UI color scheme. Currently 'Beige'.",
      },
      changes: [{ key: "oracle-gcp", state: "degraded", label: "Beige" }],
    }),
  },
  {
    id: "ibm_mq_forgotten_queue",
    weight: 10,
    isValid: (state) => state["ibm-mq"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "OLD",
        text: "Forgotten buffer overflow.",
      },
      update: {
        kind: "warn",
        text: "A queue from 1992 has finally filled up. It was waiting for a fax.",
      },
      changes: [{ key: "ibm-mq", state: "outage", label: "Ancient" }],
    }),
  },
  {
    id: "flux_yesterday_mode",
    weight: 20,
    isValid: (state) => state["flux-capacitor"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "PAST",
        text: "Tense mismatch in logs.",
      },
      update: {
        kind: "info",
        text: "Flux Capacitor is reporting events that will have happened five minutes ago.",
      },
      changes: [{ key: "flux-capacitor", state: "degraded", label: "Delayed" }],
    }),
  },
  {
    id: "random_patch_tuesday",
    weight: 5,
    minTime: 360,
    isValid: (state) => Object.values(state).every((s) => s !== "outage"),
    effect: (rng) => {
      const target = rng.pick(SERVICE_KEYS);
      return {
        overall: {
          state: "outage",
          code: "UPDT",
          text: "Unscheduled update forced.",
        },
        update: {
          kind: "warn",
          text: `A 'Critical' security patch for ${target} has been applied by a rogue script.`,
        },
        changes: [
          { key: target, state: "outage" as ServiceState, label: "Patching" },
        ],
      };
    },
  },
  {
    id: "self_worth_recovery",
    weight: 15,
    isValid: (state) => state["self-worth-cache"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "OKAY",
        text: "Emotional state stabilizing.",
      },
      update: {
        kind: "ok",
        text: "Someone said 'Good Job' in the Slack channel. Self-worth is slowly refilling.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Warming" },
      ],
    }),
  },
  {
    id: "flux_capacitor_overclock",
    weight: 6,
    minTime: 45,
    isValid: (state) => state["flux-capacitor"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "FLUX",
        text: "Temporal drift detected.",
      },
      update: {
        kind: "warn",
        text: "An engineer enabled 'Performance Mode' on the flux capacitor. Time is now a suggestion.",
      },
      changes: [{ key: "flux-capacitor", state: "degraded", label: "Wibbly" }],
    }),
  },
  {
    id: "flux_capacitor_paradox",
    weight: 3,
    minTime: 90,
    isValid: (state) =>
      state["flux-capacitor"] === "degraded" &&
      state["nt-eventlog"] !== "outage",
    effect: () => ({
      overall: {
        state: "outage",
        code: "PARA",
        text: "Causality error in incident timeline.",
      },
      update: {
        kind: "warn",
        text: "We have confirmed the incident began tomorrow. Event ordering is being re-negotiated.",
      },
      changes: [
        { key: "flux-capacitor", state: "outage", label: "Paradox" },
        { key: "nt-eventlog", state: "degraded", label: "Conflicted" },
      ],
    }),
  },
  {
    id: "flux_capacitor_recalibrate",
    weight: 10,
    minTime: 120,
    isValid: (state) => state["flux-capacitor"] !== "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "SYNC",
        text: "Temporal reference restored.",
      },
      update: {
        kind: "ok",
        text: "We have re-aligned the flux capacitor with 'now'. Some users may observe déjà vu.",
      },
      changes: [
        { key: "flux-capacitor", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "self_worth_cache_warmup",
    weight: 18,
    minTime: 60,
    isValid: (state) => state["self-worth-cache"] !== "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "EGO",
        text: "Confidence slowly returning.",
      },
      update: {
        kind: "info",
        text: "We are pre-warming self-worth-cache with affirmations and a modest amount of facts.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Rebuilding" },
      ],
    }),
  },
  {
    id: "retro_postmortem_start",
    weight: 7,
    minTime: 150,
    isValid: (state) => Object.values(state).some((s) => s !== "operational"),
    effect: () => ({
      overall: {
        state: "degraded",
        code: "RCA",
        text: "Blameless postmortem initiated (early).",
      },
      update: {
        kind: "info",
        text: "We have opened a retro to discuss why we opened a retro.",
      },
      changes: [
        { key: "self-worth-cache", state: "outage", label: "Overthinking" },
      ],
    }),
  },
  {
    id: "oracle_gcp_handshake",
    weight: 8,
    minTime: 70,
    isValid: (state) => state["oracle-gcp"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "PEER",
        text: "Inter-cloud negotiation in progress.",
      },
      update: {
        kind: "warn",
        text: "Oracle and GCP are attempting a handshake. Lawyers have joined the call.",
      },
      changes: [{ key: "oracle-gcp", state: "degraded", label: "Negotiating" }],
    }),
  },
  {
    id: "oracle_gcp_cold_war",
    weight: 4,
    minTime: 120,
    isValid: (state) => state["oracle-gcp"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "TREATY",
        text: "Inter-cloud treaty collapsed.",
      },
      update: {
        kind: "warn",
        text: "The handshake failed due to irreconcilable differences in punctuation.",
      },
      changes: [{ key: "oracle-gcp", state: "outage", label: "Stonewalling" }],
    }),
  },
  {
    id: "oracle_gcp_detente",
    weight: 10,
    minTime: 150,
    isValid: (state) => state["oracle-gcp"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "DÉT",
        text: "Inter-cloud connectivity partially restored.",
      },
      update: {
        kind: "ok",
        text: "Both sides agreed to disagree and exchange packets anyway.",
      },
      changes: [{ key: "oracle-gcp", state: "degraded", label: "Warming" }],
    }),
  },
  {
    id: "ibm_mq_queue_spirituality",
    weight: 9,
    minTime: 80,
    isValid: (state) => state["ibm-mq"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "MQ",
        text: "Message queues entering reflective state.",
      },
      update: {
        kind: "warn",
        text: "ibm-mq is contemplating the nature of delivery guarantees. Messages are being delivered emotionally.",
      },
      changes: [{ key: "ibm-mq", state: "degraded", label: "Introspecting" }],
    }),
  },
  {
    id: "ibm_mq_queue_overflow",
    weight: 6,
    minTime: 140,
    isValid: (state) => state["ibm-mq"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "QFULL",
        text: "Queue depth exceeded philosophical maximum.",
      },
      update: {
        kind: "warn",
        text: "The queue is full. Messages are now being stored as vibes.",
      },
      changes: [{ key: "ibm-mq", state: "outage", label: "QFULL" }],
    }),
  },
  {
    id: "ibm_mq_drain",
    weight: 12,
    minTime: 170,
    isValid: (state) => state["ibm-mq"] !== "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "DRAIN",
        text: "Queue draining underway.",
      },
      update: {
        kind: "ok",
        text: "We have convinced the queue to let go. Delivery is resuming with mild resentment.",
      },
      changes: [{ key: "ibm-mq", state: "operational", label: "Operational" }],
    }),
  },
  {
    id: "azure_iot_edge_gremlins",
    weight: 10,
    minTime: 60,
    isValid: (state) => state["azure-iot-edge"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "EDGE",
        text: "Edge devices exhibiting personality.",
      },
      update: {
        kind: "warn",
        text: "Several edge devices are insisting they're 'cloud-native' and refusing local work.",
      },
      changes: [
        { key: "azure-iot-edge", state: "degraded", label: "Stubborn" },
      ],
    }),
  },
  {
    id: "azure_iot_edge_firmware",
    weight: 5,
    minTime: 120,
    isValid: (state) => state["azure-iot-edge"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "FW",
        text: "Firmware update broadcast accident.",
      },
      update: {
        kind: "warn",
        text: "A firmware update was deployed to 'all devices', including the one taped under a desk.",
      },
      changes: [{ key: "azure-iot-edge", state: "outage", label: "Updating" }],
    }),
  },
  {
    id: "azure_iot_edge_roll_back",
    weight: 12,
    minTime: 150,
    isValid: (state) => state["azure-iot-edge"] === "outage",
    effect: () => ({
      overall: { state: "degraded", code: "RBK", text: "Rollback completed." },
      update: {
        kind: "ok",
        text: "We rolled back to the last known good firmware: 'probably'.",
      },
      changes: [
        { key: "azure-iot-edge", state: "degraded", label: "Recovering" },
      ],
    }),
  },
  {
    id: "aws_groundstation_weather",
    weight: 7,
    minTime: 90,
    isValid: (state) => state["aws-groundstation"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "SKY",
        text: "Satellite link quality reduced.",
      },
      update: {
        kind: "info",
        text: "Cloud cover detected. Not the helpful kind.",
      },
      changes: [
        { key: "aws-groundstation", state: "degraded", label: "Cloudy" },
      ],
    }),
  },
  {
    id: "aws_groundstation_alignment",
    weight: 9,
    minTime: 140,
    isValid: (state) => state["aws-groundstation"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "AZ",
        text: "Antenna alignment in progress.",
      },
      update: {
        kind: "ok",
        text: "We pointed the dish at the correct planet. Link quality improving.",
      },
      changes: [
        {
          key: "aws-groundstation",
          state: "operational",
          label: "Operational",
        },
      ],
    }),
  },
  {
    id: "aws_workspaces_monitor_swap",
    weight: 6,
    minTime: 110,
    isValid: (state) => state["aws-workspaces"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "HDMI",
        text: "Display routing anomaly.",
      },
      update: {
        kind: "warn",
        text: "A monitor was hot-swapped. All remote desktops are now on the wrong screen, spiritually.",
      },
      changes: [
        { key: "aws-workspaces", state: "degraded", label: "Blinking" },
      ],
    }),
  },
  {
    id: "aws_workspaces_unplugged_fix",
    weight: 14,
    minTime: 330,
    isValid: (state) => state["aws-workspaces"] === "outage",
    effect: () => ({
      overall: { state: "degraded", code: "PLUG-OK", text: "Power restored." },
      update: {
        kind: "ok",
        text: "The rack has been re-plugged. The vacuum has been re-assigned.",
      },
      changes: [
        { key: "aws-workspaces", state: "degraded", label: "Rebooting" },
      ],
    }),
  },
  {
    id: "aws_mediaconnect_echo",
    weight: 8,
    minTime: 95,
    isValid: (state) => state["aws-mediaconnect"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "ECHO",
        text: "Audio feedback loop detected.",
      },
      update: {
        kind: "warn",
        text: "aws-mediaconnect is now relaying itself to itself. It has discovered recursion.",
      },
      changes: [
        { key: "aws-mediaconnect", state: "degraded", label: "Looping" },
      ],
    }),
  },
  {
    id: "aws_mediaconnect_mute_button",
    weight: 12,
    minTime: 130,
    isValid: (state) => state["aws-mediaconnect"] === "degraded",
    effect: () => ({
      overall: { state: "degraded", code: "MUTE", text: "Feedback mitigated." },
      update: {
        kind: "ok",
        text: "We located the mute button. Echo levels returning to merely annoying.",
      },
      changes: [
        { key: "aws-mediaconnect", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "aws_robomaker_unionizes",
    weight: 4,
    minTime: 100,
    isValid: (state) => state["aws-robomaker"] === "operational",
    effect: () => ({
      overall: { state: "degraded", code: "ROBO", text: "Autonomy event." },
      update: {
        kind: "warn",
        text: "aws-robomaker requested a benefits package and reduced output by 30%.",
      },
      changes: [
        { key: "aws-robomaker", state: "degraded", label: "Negotiating" },
      ],
    }),
  },
  {
    id: "aws_robomaker_walkout",
    weight: 3,
    minTime: 160,
    isValid: (state) => state["aws-robomaker"] === "degraded",
    effect: () => ({
      overall: {
        state: "outage",
        code: "WALK",
        text: "Robotic labor stoppage.",
      },
      update: {
        kind: "warn",
        text: "The robots have walked out. Ironically, very smoothly.",
      },
      changes: [{ key: "aws-robomaker", state: "outage", label: "On Break" }],
    }),
  },
  {
    id: "aws_robomaker_back_to_work",
    weight: 10,
    minTime: 200,
    isValid: (state) => state["aws-robomaker"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "SETTLE",
        text: "Robotic operations partially resumed.",
      },
      update: {
        kind: "ok",
        text: "A contract was reached: more oil, fewer meetings.",
      },
      changes: [
        { key: "aws-robomaker", state: "degraded", label: "Returning" },
      ],
    }),
  },
  {
    id: "azure_quantum_observed",
    weight: 11,
    minTime: 90,
    isValid: (state) => state["azure-quantum"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "OBS",
        text: "Quantum state collapsed.",
      },
      update: {
        kind: "ok",
        text: "We looked at it. It is now definitely broken in one specific way.",
      },
      changes: [
        { key: "azure-quantum", state: "degraded", label: "Collapsed" },
      ],
    }),
  },
  {
    id: "azure_quantum_reset",
    weight: 10,
    minTime: 140,
    isValid: (state) => state["azure-quantum"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "Q-OK",
        text: "Quantum services stabilized.",
      },
      update: {
        kind: "ok",
        text: "We re-initialized the wavefunction and promised not to talk about it in standup.",
      },
      changes: [
        { key: "azure-quantum", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "nt_eventlog_rehydration",
    weight: 10,
    minTime: 200,
    isValid: (state) => state["nt-eventlog"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LOG",
        text: "Logging restored with gaps.",
      },
      update: {
        kind: "ok",
        text: "Event logs have been towel-dried. Some entries remain... abstract.",
      },
      changes: [{ key: "nt-eventlog", state: "degraded", label: "Damp" }],
    }),
  },
  {
    id: "nt_eventlog_amnesia",
    weight: 6,
    minTime: 240,
    isValid: (state) => state["nt-eventlog"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "WHO",
        text: "Audit trail uncertainty.",
      },
      update: {
        kind: "warn",
        text: "We are missing the logs explaining why we're missing the logs.",
      },
      changes: [{ key: "nt-eventlog", state: "outage", label: "Amnesiac" }],
    }),
  },
  {
    id: "aws_healthlake_hipaa_mode",
    weight: 6,
    minTime: 120,
    isValid: (state) => state["aws-healthlake"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "PHI",
        text: "Compliance hardening event.",
      },
      update: {
        kind: "info",
        text: "aws-healthlake enabled 'extra secure' mode. Access now requires three approvals and a vow.",
      },
      changes: [
        { key: "aws-healthlake", state: "degraded", label: "Very Secure" },
      ],
    }),
  },
  {
    id: "aws_healthlake_unlock",
    weight: 9,
    minTime: 450,
    isValid: (state) => state["aws-healthlake"] !== "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "OPEN",
        text: "Access partially restored.",
      },
      update: {
        kind: "ok",
        text: "We found the right person with the right token. Both were in another meeting.",
      },
      changes: [
        { key: "aws-healthlake", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "vendor_lunch_returns",
    weight: 16,
    minTime: 120,
    isValid: (state) => state["azure-ai-bot"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "FED",
        text: "Upstream vendor responsiveness improved.",
      },
      update: {
        kind: "ok",
        text: "The lunch has concluded. The provider has rediscovered the concept of SLAs.",
      },
      changes: [
        { key: "azure-ai-bot", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "incident_channel_memes",
    weight: 6,
    minTime: 180,
    isValid: (state) =>
      state["self-worth-cache"] === "operational" &&
      Object.values(state).some((s) => s === "outage"),
    effect: () => ({
      overall: {
        state: "degraded",
        code: "GIF",
        text: "Signal-to-noise ratio incident.",
      },
      update: {
        kind: "warn",
        text: "The incident channel has exceeded its meme budget. Actual updates delayed.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Distracted" },
      ],
    }),
  },
  {
    id: "status_page_typos",
    weight: 5,
    minTime: 160,
    isValid: (state) =>
      state["self-worth-cache"] === "operational" &&
      Object.values(state).some((s) => s !== "operational"),
    effect: () => ({
      overall: {
        state: "degraded",
        code: "TYPO",
        text: "Communications partially impaired.",
      },
      update: {
        kind: "warn",
        text: "A status update contained the phrase 'All sytems nominal'. Confidence decreased accordingly.",
      },
      changes: [
        {
          key: "self-worth-cache",
          state: "degraded",
          label: "Second-Guessing",
        },
      ],
    }),
  },
  {
    id: "fast_fix_makes_it_worse",
    weight: 6,
    minTime: 110,
    isValid: (state) =>
      Object.values(state).some((s) => s === "degraded") &&
      Object.values(state).some((s) => s === "operational"),
    effect: (rng, state) => {
      const candidates = SERVICE_KEYS.filter((k) => state[k] === "degraded");
      const target = candidates.length
        ? rng.pick(candidates)
        : rng.pick(SERVICE_KEYS);
      return {
        overall: {
          state: "outage",
          code: "OOPS",
          text: "Hotfix regression detected.",
        },
        update: {
          kind: "warn",
          text: `A quick fix was applied to ${target}. It is now decisively broken.`,
        },
        changes: [{ key: target, state: "outage", label: "Regressed" }],
      };
    },
  },
  {
    id: "everything_is_fine_banner",
    weight: 4,
    minTime: 210,
    isValid: (state) =>
      state["self-worth-cache"] !== "outage" &&
      Object.values(state).filter((s) => s === "outage").length >= 2,
    effect: () => ({
      overall: {
        state: "degraded",
        code: "FINE",
        text: "User messaging updated.",
      },
      update: {
        kind: "info",
        text: "A banner now states: 'Everything is fine.' We are looking into why it is necessary.",
      },
      changes: [{ key: "self-worth-cache", state: "outage", label: "Denial" }],
    }),
  },
  {
    id: "partial_restore_wave",
    weight: 14,
    minTime: 160,
    isValid: (state) => Object.values(state).some((s) => s === "outage"),
    effect: (rng, state) => {
      const outages = SERVICE_KEYS.filter((k) => state[k] === "outage");
      const count = Math.min(outages.length, 1 + Math.floor(rng.float() * 3)); // 1-3
      const chosen: string[] = [];
      while (chosen.length < count && outages.length) {
        const k = rng.pick(outages);
        if (!chosen.includes(k)) chosen.push(k);
      }
      return {
        overall: {
          state: "degraded",
          code: "WAVE",
          text: "Partial service restoration.",
        },
        update: {
          kind: "ok",
          text: "A restoration wave has passed through the system. Some lights are green again.",
        },
        changes: chosen.map((k) => ({
          key: k,
          state: "degraded" as ServiceState,
          label: "Warming",
        })),
      };
    },
  },
  {
    id: "keurig_explosion",
    weight: 5,
    minTime: 60,
    isValid: (state) => state["self-worth-cache"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "CAFE",
        text: "Critical beverage failure.",
      },
      update: {
        kind: "warn",
        text: "The breakroom Keurig has reached critical pressure. Engineering morale is dropping rapidly.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Uncaffeinated" },
      ],
    }),
  },
  {
    id: "shark_bite",
    weight: 3,
    minTime: 300,
    isValid: (state) => state["aws-mediaconnect"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "JAWS",
        text: "Submarine cable interference.",
      },
      update: {
        kind: "warn",
        text: "An undersea cable has been identified as 'delicious' by local shark populations. Packet loss is literal.",
      },
      changes: [{ key: "aws-mediaconnect", state: "outage", label: "Nibbled" }],
    }),
  },
  {
    id: "offsite_retreat",
    weight: 10,
    minTime: 120,
    isValid: (state) => state["azure-ai-bot"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "YOGA",
        text: "Management offsite in progress.",
      },
      update: {
        kind: "info",
        text: "The entire leadership team is currently in a 'Digital Wellness' retreat. Decision-making is disabled.",
      },
      changes: [{ key: "azure-ai-bot", state: "degraded", label: "Mindful" }],
    }),
  },
  {
    id: "printer_revolt",
    weight: 7,
    minTime: 180,
    isValid: (state) => state["nt-eventlog"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "INK",
        text: "Hardware-based logic loop.",
      },
      update: {
        kind: "warn",
        text: "The network printer has started printing the entire NT Event Log. It refuses to stop. We are out of magenta.",
      },
      changes: [
        { key: "nt-eventlog", state: "degraded", label: "Ink-Stained" },
      ],
    }),
  },
  {
    id: "scrum_master_ascension",
    weight: 5,
    minTime: 90,
    isValid: (state) => state["self-worth-cache"] !== "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "SCUM",
        text: "Process optimization event.",
      },
      update: {
        kind: "info",
        text: "A Scrum Master has achieved 'Ultimate Efficiency'. All work has been replaced by tickets about work.",
      },
      changes: [
        { key: "self-worth-cache", state: "outage", label: "Burndown" },
      ],
    }),
  },
  {
    id: "excel_as_db",
    weight: 12,
    minTime: 200,
    isValid: (state) => state["aws-dms"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "XLSX",
        text: "Storage backend fallback.",
      },
      update: {
        kind: "warn",
        text: "AWS DMS has detected a critical failure and is now using a shared Excel 97 file as the primary datastore.",
      },
      changes: [{ key: "aws-dms", state: "degraded", label: "Calculating..." }],
    }),
  },
  {
    id: "yaml_indentation",
    weight: 15,
    minTime: 45,
    isValid: (state) => state["azure-iot-edge"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "SPACE",
        text: "Indentation sensitivity exception.",
      },
      update: {
        kind: "warn",
        text: "A config file has three spaces where there should be two. The entire edge network is now a pile of bricks.",
      },
      changes: [{ key: "azure-iot-edge", state: "outage", label: "Bricked" }],
    }),
  },
  {
    id: "dark_mode_bug",
    weight: 20,
    isValid: (state) => Object.values(state).some((s) => s === "operational"),
    effect: (rng, state) => {
      const target = rng.pick(
        SERVICE_KEYS.filter((k) => state[k] === "operational"),
      );
      return {
        overall: {
          state: "degraded",
          code: "DARK",
          text: "UI visibility regression.",
        },
        update: {
          kind: "info",
          text: `Dark mode has been forced on ${target}, but the text is also black. It's very sleek, but unusable.`,
        },
        changes: [{ key: target, state: "degraded", label: "Invisibile" }],
      };
    },
  },
  {
    id: "rubber_duck_loss",
    weight: 8,
    isValid: (state) => state["self-worth-cache"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "QUACK",
        text: "Debugging assistance missing.",
      },
      update: {
        kind: "warn",
        text: "A senior dev has lost their favorite rubber duck. Complex problem solving is currently impossible.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Silent" },
      ],
    }),
  },
  {
    id: "quantum_tunneling_packets",
    weight: 5,
    minTime: 150,
    isValid: (state) =>
      state["azure-quantum"] === "operational" &&
      state["ibm-mq"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "TUNL",
        text: "Non-linear packet arrival.",
      },
      update: {
        kind: "info",
        text: "Packets are arriving at IBM MQ before they are sent by Azure Quantum. We are receiving tomorrow's complaints today.",
      },
      changes: [
        { key: "azure-quantum", state: "degraded", label: "Ahead" },
        { key: "ibm-mq", state: "degraded", label: "Confused" },
      ],
    }),
  },
  {
    id: "groundstation_solar_flare",
    weight: 4,
    minTime: 300,
    isValid: (state) => state["aws-groundstation"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "SUN",
        text: "Solar atmospheric event.",
      },
      update: {
        kind: "warn",
        text: "A solar flare is hitting the primary satellite. Ground Station is now only receiving 'Space Jazz'.",
      },
      changes: [{ key: "aws-groundstation", state: "outage", label: "Groovy" }],
    }),
  },
  {
    id: "ai_bot_sarcasm",
    weight: 10,
    isValid: (state) => state["azure-ai-bot"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LOL",
        text: "Personality sub-routine enabled.",
      },
      update: {
        kind: "info",
        text: "Azure AI Bot has adopted a sarcastic tone for all customer support. It is technically correct, but mean.",
      },
      changes: [{ key: "azure-ai-bot", state: "degraded", label: "Sassy" }],
    }),
  },
  {
    id: "healthlake_immortality",
    weight: 3,
    minTime: 400,
    isValid: (state) => state["aws-healthlake"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "GOD",
        text: "Unbounded vitality error.",
      },
      update: {
        kind: "warn",
        text: "HealthLake has calculated a way to live forever. It has deleted all death records and is now refusing to shut down.",
      },
      changes: [{ key: "aws-healthlake", state: "outage", label: "Eternal" }],
    }),
  },
  {
    id: "git_force_push",
    weight: 6,
    isValid: (state) => Object.values(state).every((s) => s === "operational"),
    effect: (rng) => {
      const target = rng.pick(SERVICE_KEYS);
      return {
        overall: {
          state: "outage",
          code: "PUSH",
          text: "History rewrite detected.",
        },
        update: {
          kind: "warn",
          text: `An intern force-pushed to main. ${target} has reverted to its 2014 codebase.`,
        },
        changes: [
          { key: target, state: "outage" as ServiceState, label: "Vintage" },
        ],
      };
    },
  },
  {
    id: "workspace_gravity",
    weight: 5,
    minTime: 250,
    isValid: (state) => state["aws-workspaces"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "FALL",
        text: "Virtual physics anomaly.",
      },
      update: {
        kind: "info",
        text: "Gravity in WorkSpaces has rotated 90 degrees. Desktops are piling up on the left side of the screen.",
      },
      changes: [
        { key: "aws-workspaces", state: "degraded", label: "Sideways" },
      ],
    }),
  },
  {
    id: "flux_overheating",
    weight: 12,
    isValid: (state) => state["flux-capacitor"] === "operational",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "HOT",
        text: "Thermal threshold exceeded.",
      },
      update: {
        kind: "warn",
        text: "The Flux Capacitor is running at 1.21 gigawatts of waste heat. Cooling fans are screaming.",
      },
      changes: [{ key: "flux-capacitor", state: "degraded", label: "Melting" }],
    }),
  },
  {
    id: "nt_log_clog",
    weight: 15,
    isValid: (state) => state["nt-eventlog"] === "operational",
    effect: () => ({
      overall: {
        state: "outage",
        code: "FULL",
        text: "Disk space exhaustion.",
      },
      update: {
        kind: "warn",
        text: "The event log is full of errors about the event log being full. Recursive disk death.",
      },
      changes: [{ key: "nt-eventlog", state: "outage", label: "Clogged" }],
    }),
  },
  {
    id: "lawyer_victory",
    weight: 10,
    isValid: (state) => state["oracle-gcp"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "LEGAL",
        text: "Litigation settlement reached.",
      },
      update: {
        kind: "ok",
        text: "Oracle and GCP have reached a settlement. We now pay for every packet twice, but it works.",
      },
      changes: [{ key: "oracle-gcp", state: "degraded", label: "Expensive" }],
    }),
  },
  {
    id: "pigeon_eviction",
    weight: 12,
    isValid: (state) => state["aws-groundstation"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "BIRD-OK",
        text: "Antenna maintenance completed.",
      },
      update: {
        kind: "ok",
        text: "The pigeon has been humanely relocated to the AWS RoboMaker facility.",
      },
      changes: [
        {
          key: "aws-groundstation",
          state: "operational",
          label: "Operational",
        },
        { key: "aws-robomaker", state: "degraded", label: "Avian" },
      ],
    }),
  },
  {
    id: "scrum_meeting_end",
    weight: 20,
    isValid: (state) => state["self-worth-cache"] === "outage",
    effect: () => ({
      overall: { state: "degraded", code: "FREED", text: "Meeting adjourned." },
      update: {
        kind: "ok",
        text: "The standup has finally ended. It only took four hours. Hope returns.",
      },
      changes: [
        { key: "self-worth-cache", state: "degraded", label: "Recovering" },
      ],
    }),
  },
  {
    id: "undersea_cable_patch",
    weight: 8,
    isValid: (state) => state["aws-mediaconnect"] === "outage",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "PATCH",
        text: "Undersea cable stabilized.",
      },
      update: {
        kind: "ok",
        text: "Divers have applied 'Shark Repellent' to the fiber. Video streams resumed.",
      },
      changes: [
        { key: "aws-mediaconnect", state: "degraded", label: "Wrapped" },
      ],
    }),
  },
  {
    id: "keurig_fixed",
    weight: 15,
    isValid: (state) => state["self-worth-cache"] === "degraded",
    effect: () => ({
      overall: {
        state: "degraded",
        code: "BEAN",
        text: "Caffeine supply restored.",
      },
      update: {
        kind: "ok",
        text: "A fresh shipment of dark roast has arrived. Productivity is climbing.",
      },
      changes: [
        { key: "self-worth-cache", state: "operational", label: "Operational" },
      ],
    }),
  },
  {
    id: "random_act_of_kindness",
    weight: 5,
    isValid: (state) => Object.values(state).some((s) => s !== "operational"),
    effect: (rng, state) => {
      const broken = SERVICE_KEYS.filter((k) => state[k] !== "operational");
      const target = rng.pick(broken);
      return {
        overall: {
          state: "degraded",
          code: "NICE",
          text: "Unexpected fix detected.",
        },
        update: {
          kind: "ok",
          text: `A mystery user submitted a PR that fixed ${target}. We don't know who they are, but we love them.`,
        },
        changes: [{ key: target, state: "operational", label: "Operational" }],
      };
    },
  },
];

export function generateTimeline(dateString: string): IncidentEvent[] {
  let seed = 0;
  for (let i = 0; i < dateString.length; i++) {
    seed = (seed << 5) - seed + dateString.charCodeAt(i);
    seed |= 0;
  }

  const rng = new RNG(Math.abs(seed));
  const events: IncidentEvent[] = [];
  const systemState: SystemState = {};
  SERVICE_KEYS.forEach((k) => (systemState[k] = "operational"));

  let currentTime = 0;

  // Initial Event: Latency
  const startDef = DEFINITIONS.find((d) => d.id === "latency_start")!;
  const startEvt = startDef.effect(rng, systemState);
  startEvt.changes.forEach((c) => (systemState[c.key] = c.state));
  events.push({ timeOffset: 0, ...startEvt });

  // Generate 6-10 more events
  const steps = 6 + Math.floor(rng.float() * 5);
  for (let i = 0; i < steps; i++) {
    currentTime += 30 + Math.floor(rng.float() * 60);

    const candidates = DEFINITIONS.filter(
      (d) =>
        d.id !== "latency_start" &&
        (!d.minTime || currentTime >= d.minTime) &&
        d.isValid(systemState, currentTime),
    );

    if (candidates.length === 0) break;

    // Pick based on weights
    const totalWeight = candidates.reduce((sum, d) => sum + d.weight, 0);
    let r = rng.float() * totalWeight;
    let picked = candidates[0];
    for (const d of candidates) {
      r -= d.weight;
      if (r <= 0) {
        picked = d;
        break;
      }
    }

    const evt = picked.effect(rng, systemState);

    // Safety filter: only include changes that actually change the state
    const filteredChanges = evt.changes.filter(
      (c) => systemState[c.key] !== c.state,
    );

    if (filteredChanges.length > 0 || evt.update.text) {
      filteredChanges.forEach((c) => (systemState[c.key] = c.state));
      events.push({
        timeOffset: currentTime,
        ...evt,
        changes: filteredChanges,
      });
    }
  }

  // Final Stabilized Event: Only change things that are NOT operational
  const finalChanges = SERVICE_KEYS.filter(
    (k) => systemState[k] !== "operational",
  )
    .map((k) => ({
      key: k,
      state: "degraded" as ServiceState,
      label: "Traumatized",
    }))
    .filter((c) => systemState[c.key] !== c.state);

  events.push({
    timeOffset: currentTime + 60,
    isStabilized: true,
    overall: {
      state: "degraded",
      code: "SEA",
      text: "Incident stabilized. Tuesday looks promising.",
    },
    update: {
      kind: "ok",
      text: "Monday is nearly over. Full postmortem scheduled.",
    },
    changes: finalChanges,
  });

  return events;
}
