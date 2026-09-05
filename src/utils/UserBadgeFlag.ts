import { ph, t } from "@lingui/core/macro";

const UserBadgeBits = {
  FOUNDER: 1 << 0,
  ADMIN: 1 << 1,
  CONTRIBUTOR: 1 << 2,
  SUPPORTER: 1 << 3,
  PALESTINE: 1 << 4,
  BOT: 1 << 5,
  MOD: 1 << 6,
  EMO_SUPPORTER: 1 << 7,

  CAT_EARS_WHITE: 1 << 8,
  CAT_EARS_BLUE: 1 << 9,

  FOX_EARS_GOLD: 1 << 10,
  FOX_EARS_BROWN: 1 << 11,

  BUNNY_EARS_BLACK: 1 << 12,
  BUNNY_EARS_MAID: 1 << 13,
  DOG_EARS_BROWN: 1 << 14,
  DOG_SHIBA: 1 << 15,

  WOLF_EARS: 1 << 16,
  GOAT_EARS_WHITE: 1 << 17,
  DEER_EARS_HORNS: 1 << 18,
  GOAT_HORNS: 1 << 19,
  DEER_EARS_HORNS_DARK: 1 << 20,
  CAT_EARS_MAID: 1 << 21,
  CAT_EARS_PURPLE: 1 << 22,
  DEER_EARS_WHITE: 1 << 23,
} as const;

export const BadgeStyle = {
  Wings: 1,
  Ears: 2,
} as const;

export type BadgeStyle = (typeof BadgeStyle)[keyof typeof BadgeStyle];

type BaseBadge = {
  name: () => string;
  bit: (typeof UserBadgeBits)[keyof typeof UserBadgeBits];
  color: string;
  overlay?: boolean;
  description: () => string;
  textColor?: string;
  credit?: () => string;
  type?: "earned";
  icon?: string;
  removable?: boolean;
};

export type EarBadge = BaseBadge & {
  style: typeof BadgeStyle.Ears;
  assets: {
    ear: string;
    tail?: {
      asset: string;
      offset?: {
        default?: { left: number; bottom: number };
        [BadgeStyle.Wings]?: { left: number; bottom: number };
      };
    };
    scale?: number;
    offset?: {
      default?: number;
      [BadgeStyle.Wings]?: number;
    };
  };
};
export type WingsBadge = BaseBadge & {
  style: typeof BadgeStyle.Wings;
  assets: {
    border: string;
  };
};

type PlainBadge = BaseBadge & {
  style?: undefined;
  assets?: undefined;
};

export type UserBadge = WingsBadge | EarBadge | PlainBadge;

const createCredit = ({
  author,
  platform,
  editor,
}: {
  author: string;
  platform: string;
  editor?: string;
}) => {
  if (editor) {
    return t`Avatar Border by ${ph({ author })} on ${ph({ platform })}, edited by ${ph({ editor })}`;
  }
  return t`Avatar Border by ${ph({ author })} on ${ph({ platform })}`;
};

const credits = {
  upklyakEdited: () =>
    createCredit({
      author: "upklyak",
      platform: "Freepik",
      editor: "Supertiger",
    }),
  upklyak: () =>
    createCredit({
      author: "upklyak",
      platform: "Freepik",
    }),
};

export const UserBadges = {
  // overlays
  DEER_EARS_WHITE: {
    name: () => t`Deer`,
    bit: UserBadgeBits.DEER_EARS_WHITE,
    color: "linear-gradient(273deg, #fb83a7, #ffffff)",
    textColor: "#2a1d1d",
    overlay: true,
    description: () => t`Kawaii Pink Deer`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "deer-ears-white",
      scale: 1.1,
      offset: {
        default: -25,
        [BadgeStyle.Wings]: -22,
      },
    },
  },
  DEER_EARS_HORNS_DARK: {
    name: () => t`Deer`,
    bit: UserBadgeBits.DEER_EARS_HORNS_DARK,
    color: "linear-gradient(267deg, #8f8f8f, #090a25)",
    textColor: "#ffffff",
    overlay: true,
    description: () => t`Emo Deer Antlers`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "deer-ears-horns-dark",
      offset: {
        default: -25,
        [BadgeStyle.Wings]: -22,
      },
    },
  },
  DEER_EARS_HORNS: {
    name: () => t`Deer`,
    bit: UserBadgeBits.DEER_EARS_HORNS,
    color: "linear-gradient(270deg, #aa4908, #ffd894)",
    textColor: "#321515",
    overlay: true,
    description: () => t`Cute Deer Antlers`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "deer-ears-horns",
      offset: {
        default: -25,
        [BadgeStyle.Wings]: -22,
      },
    },
  },
  GOAT_HORNS: {
    name: () => t`Goat`,
    bit: UserBadgeBits.GOAT_HORNS,
    color: "linear-gradient(268deg, #cb75d7, #390a8f)",
    overlay: true,
    description: () => t`Goat Horns`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "goat-horns",
      scale: 1.4,
      offset: {
        default: -3,
        [BadgeStyle.Wings]: -3,
      },
    },
  },
  GOAT_EARS_WHITE: {
    name: () => t`Goat`,
    bit: UserBadgeBits.GOAT_EARS_WHITE,
    color: "linear-gradient(89deg, #ffecc2, #94e4ff)",
    textColor: "#503030",
    overlay: true,
    description: () => t`Kawaii Goat Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "goat-ears-white",
      scale: 1.4,
      offset: {
        default: -3,
        [BadgeStyle.Wings]: -3,
      },
    },
  },
  WOLF_EARS: {
    name: () => t`Wolf`,
    bit: UserBadgeBits.WOLF_EARS,
    color: "linear-gradient(90deg, #585858ff 0%, #252525ff 100%)",
    textColor: "#ffffff",
    overlay: true,
    description: () => t`Wolfy Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "wolf-ears",
      offset: {
        default: -13,
        [BadgeStyle.Wings]: -13,
      },
    },
  },
  DOG_SHIBA: {
    name: () => t`Doggy`,
    bit: UserBadgeBits.DOG_SHIBA,
    color: "linear-gradient(261deg, #ffeeb3, #9e7aff)",
    textColor: "#2e1919",
    overlay: true,
    description: () => t`Shiba Inu Doggy`,
    icon: "sound_detection_dog_barking",
    style: BadgeStyle.Ears,
    assets: {
      ear: "dog-ears-shiba",
      scale: 1.2,
      tail: {
        asset: "dog-tail-shiba",
        offset: {
          default: { left: -29, bottom: -2 },
          [BadgeStyle.Wings]: { left: -27, bottom: -6 },
        },
      },
      offset: {
        default: -6,
        [BadgeStyle.Wings]: -6,
      },
    },
  },
  DOG_EARS_BROWN: {
    name: () => t`Doggy`,
    bit: UserBadgeBits.DOG_EARS_BROWN,
    color: "linear-gradient(90deg, #bb7435 0%, #ffbd67ff 100%)",
    overlay: true,
    description: () => t`Good Puppy Ears`,
    icon: "sound_detection_dog_barking",
    style: BadgeStyle.Ears,
    assets: {
      ear: "dog-ears-brown",
      offset: {
        default: 0,
        [BadgeStyle.Wings]: -2,
      },
    },
  },
  BUNNY_EARS_MAID: {
    name: () => t`Bunny`,
    bit: UserBadgeBits.BUNNY_EARS_MAID,
    color: "linear-gradient(100deg, #ff94e2, #ffffff)",
    textColor: "#2a1d1d",
    overlay: true,
    description: () => t`Maid Bunny Ears`,
    icon: "cruelty_free",
    style: BadgeStyle.Ears,
    assets: {
      ear: "bunny-ears-maid",
      offset: {
        default: -23,
        [BadgeStyle.Wings]: -23,
      },
    },
  },
  BUNNY_EARS_BLACK: {
    name: () => t`Bunny`,
    bit: UserBadgeBits.BUNNY_EARS_BLACK,
    color: "linear-gradient(90deg, #585858ff 0%, #252525ff 100%)",
    textColor: "#ffffff",
    overlay: true,
    description: () => t`Floppy Bunny Ears`,
    icon: "cruelty_free",
    style: BadgeStyle.Ears,
    assets: {
      ear: "bunny-ears-black",
      offset: {
        default: -23,
        [BadgeStyle.Wings]: -22,
      },
    },
  },
  CAT_EARS_MAID: {
    name: () => t`Kitty`,
    bit: UserBadgeBits.CAT_EARS_MAID,
    color: "linear-gradient(100deg, #ff94e2, #ffffff)",
    textColor: "#2a1d1d",
    overlay: true,
    description: () => t`Kitty Maid Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "cat-ears-maid",
      offset: {
        default: -10,
        [BadgeStyle.Wings]: -11,
      },
    },
  },
  CAT_EARS_PURPLE: {
    name: () => t`Kitty`,
    bit: UserBadgeBits.CAT_EARS_PURPLE,
    color: "linear-gradient(268deg, #cb75d7, #390a8f)",
    textColor: "#ffffff",
    overlay: true,
    description: () => t`Chesire Kitty Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "cat-ears-purple",
      offset: {
        default: -5,
        [BadgeStyle.Wings]: -4,
      },
    },
  },
  CAT_EARS_BLUE: {
    name: () => t`Kitty`,
    bit: UserBadgeBits.CAT_EARS_BLUE,
    color: "linear-gradient(90deg, #78a5ff 0%, #ffffff 100%)",
    overlay: true,
    description: () => t`Arctic Kitty Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "cat-ears-blue",
      offset: {
        default: -5,
        [BadgeStyle.Wings]: -4,
      },
    },
  },

  CAT_EARS_WHITE: {
    name: () => t`Kitty`,
    bit: UserBadgeBits.CAT_EARS_WHITE,
    color: "linear-gradient(90deg, #ffa761 0%, #ffffff 100%)",
    overlay: true,
    description: () => t`Calico Kitty Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "cat-ears-white",
      offset: {
        default: -5,
        [BadgeStyle.Wings]: -4,
      },
    },
  },

  FOX_EARS_GOLD: {
    name: () => t`Foxy`,
    bit: UserBadgeBits.FOX_EARS_GOLD,
    color: "linear-gradient(90deg, #ffb100 0%, #ffffff 100%)",
    overlay: true,
    description: () => t`Golden Foxy Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "fox-ears-gold",
      offset: {
        default: -13,
        [BadgeStyle.Wings]: -13,
      },
    },
  },

  FOX_EARS_BROWN: {
    name: () => t`Foxy`,
    bit: UserBadgeBits.FOX_EARS_BROWN,
    color: "linear-gradient(90deg, #bb7435 0%, #ffffff 100%)",
    overlay: true,
    description: () => t`Brown Foxy Ears`,
    icon: "pets",
    style: BadgeStyle.Ears,
    assets: {
      ear: "fox-ears-brown",
      offset: {
        default: -13,
        [BadgeStyle.Wings]: -13,
      },
    },
  },

  // borders

  FOUNDER: {
    name: () => t`Founder`,
    bit: UserBadgeBits.FOUNDER,
    description: () => t`Creator of Nerimity`,
    color: "linear-gradient(90deg, #4fffbd 0%, #4a5efc 100%)",
    credit: credits.upklyak,
    type: "earned",
    icon: "crown",
    removable: false,
    style: BadgeStyle.Wings,
    assets: {
      border: "founder",
    },
  },

  ADMIN: {
    name: () => "Sweetheart",
    bit: UserBadgeBits.ADMIN,
    description: () => "Beloved Supporter",
    color:
      "linear-gradient(90deg, rgba(224,26,185,1) 0%, rgba(64,122,255,1) 100%)",
    credit: credits.upklyakEdited,

    type: "earned",
    icon: "verified_user",
    removable: false,
    style: BadgeStyle.Wings,
    assets: {
      border: "admin",
    },
  },

  MOD: {
    name: () => t`Moderator`,
    bit: UserBadgeBits.MOD,
    description: () => t`Moderator of Nerimity`,
    color: "linear-gradient(90deg, #57acfa 0%, #1485ed 100%)",
    credit: credits.upklyak,

    type: "earned",
    icon: "shield",
    removable: false,
    style: BadgeStyle.Wings,
    assets: {
      border: "mod",
    },
  },

  EMO_SUPPORTER: {
    name: () => t`Emo Supporter`,
    description: () => t`Supported this project by donating money`,
    bit: UserBadgeBits.EMO_SUPPORTER,
    textColor: "rgba(255,255,255,0.8)",
    color: "linear-gradient(90deg, #424242 0%, #303030 100%)",
    credit: credits.upklyakEdited,
    type: "earned",
    icon: "favorite",
    style: BadgeStyle.Wings,
    assets: {
      border: "emo-supporter",
    },
  },

  SUPPORTER: {
    name: () => t`Supporter`,
    description: () => t`Supported this project by donating money`,
    bit: UserBadgeBits.SUPPORTER,
    color:
      "linear-gradient(90deg, rgba(235,78,209,1) 0%, rgba(243,189,247,1) 100%)",
    credit: credits.upklyak,
    type: "earned",
    icon: "favorite",
    style: BadgeStyle.Wings,
    assets: {
      border: "supporter",
    },
  },

  CONTRIBUTOR: {
    name: () => t`Contributor`,
    description: () => t`Helped with this project in some way`,
    bit: UserBadgeBits.CONTRIBUTOR,
    color: "#ffffff",
    type: "earned",
    icon: "crowdsource",
  },

  PALESTINE: {
    name: () => t`Palestine`,
    description: () =>
      "[Click to help](https://arab.org/click-to-help/palestine/)",
    bit: UserBadgeBits.PALESTINE,
    color: "linear-gradient(90deg, red, white, green)",
    credit: credits.upklyakEdited,
    icon: "volunteer_activism",
    style: BadgeStyle.Wings,

    assets: {
      border: "palestine",
    },
  },

  BOT: {
    name: () => t`Bot`,
    description: () => t`This user is a bot`,
    bit: UserBadgeBits.BOT,
    color: "var(--primary-color)",
    type: "earned",
    icon: "robot_2",
    removable: false,
  },
} satisfies Record<string, UserBadge>;

export const UserBadgeValues = Object.values(UserBadges) as UserBadge[];
