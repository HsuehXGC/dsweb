/**
 * 主页 9 个 section 的内容种子 —— 取自《主页前端设计》文档双语文案。
 * 每个 section 一个 block，content 为 { en, zh } 双语结构，前端按 section.type 渲染。
 */

export interface HomeSectionSeed {
  type: string;
  config?: Record<string, unknown>;
  content: Record<string, unknown>; // { en: {...}, zh: {...} }
}

const BOOK = { en: 'Book a Free On-Site Assessment', zh: '预约免费上门评估' };

export const HOMEPAGE_SECTIONS: HomeSectionSeed[] = [
  // 1. Hero
  {
    type: 'hero',
    config: { bg: 'brand-light' },
    content: {
      en: {
        eyebrow: 'Smart Robotic Lawn Care for New England',
        title: 'Your Lawn, On Autopilot.',
        subtitle:
          'We sell, install, and service robotic lawnmowers for large yards, hobby farms, and country properties across Eastern Massachusetts.',
        primaryCta: BOOK.en,
        secondaryCta: 'See How It Works',
        badges: ['Locally Owned & Operated', 'Fully Insured', 'Eastern MA Coverage', 'On-Site Installation'],
      },
      zh: {
        eyebrow: '新英格兰智能割草解决方案',
        title: '让你的草坪，自动管理。',
        subtitle:
          '为东马萨诸塞州的大庭院、小型农场与乡村物业，提供智能割草机器人销售、安装与长期维护服务。',
        primaryCta: BOOK.zh,
        secondaryCta: '了解工作原理',
        badges: ['本地运营，专业团队', '全额保险覆盖', '服务东马萨地区', '上门部署，全程托管'],
      },
    },
  },
  // 2. Three ways to start
  {
    type: 'three_ways',
    content: {
      en: {
        title: 'Three Ways to Start',
        subtitle: 'Whatever your situation, the first step is the same — let us see your lawn.',
        cards: [
          {
            title: 'Buy & Install',
            desc: 'Own a robotic mower built for your land, professionally installed and tuned to your terrain.',
            points: 'Includes RTK setup · No-go zones · App configuration',
            cta: 'Explore Robots',
          },
          {
            title: 'On-Site Service',
            desc: 'Not sure yet? Start with a free assessment. We come to you, walk your land, and give you honest options.',
            points: 'Free site assessment · Installation · Seasonal maintenance',
            cta: 'Book Free Assessment',
            recommended: true,
          },
          {
            title: 'Rent or Try First',
            desc: 'Try a robotic mower on your own lawn before you commit. Weekend trials, monthly rentals, and rent-to-own.',
            points: 'Rental fees apply toward purchase · Try before you buy',
            cta: 'See Rental Options',
          },
        ],
      },
      zh: {
        title: '三种开始方式',
        subtitle: '无论你的情况如何，第一步都一样——让我们先看看你的草坪。',
        cards: [
          {
            title: '整机购买 + 上门部署',
            desc: '拥有一台为你的地块定制安装、专业调试的智能割草机器人。',
            points: '包含 RTK 基站 · 边界设置 · App 配置',
            cta: '查看机器人',
          },
          {
            title: '上门服务',
            desc: '还不确定？先约一次免费评估。我们上门勘察你的地块，给出诚实的方案建议。',
            points: '免费评估 · 安装部署 · 季节维护',
            cta: '预约免费评估',
            recommended: true,
          },
          {
            title: '租赁或先试用',
            desc: '在决定购买前，先在你自家草坪上试用一台。提供周末体验、月租与租后转购方案。',
            points: '租金可抵扣购机款 · 先试后买',
            cta: '查看租赁方案',
          },
        ],
      },
    },
  },
  // 3. Weekly visit (Burlington demo day + install routes)
  {
    type: 'weekly_visit',
    content: {
      en: {
        title: 'See Us This Week',
        subtitle:
          "Skip the back-and-forth. Meet us in person — at our weekly demo day, or when we're already in your neighborhood.",
        demoDay: {
          title: 'Weekly Demo Day · Burlington, MA',
          time: 'Every Saturday · 10 AM – 2 PM ET',
          invite:
            'Come walk our demo yard. See the robot in action on a real New England lawn — slopes, stone walls, the works. Bring questions, leave with answers.',
          note: 'Free · No appointment required, but reserving helps us prep.',
          cta: 'Reserve Your Spot',
        },
        routes: {
          title: "This Week We're In…",
          subtitle:
            "If we're already heading to your town for an install, we can swing by for a free assessment — no extra trip needed.",
          towns: [
            { day: 'Mon', town: 'Concord' },
            { day: 'Wed', town: 'Sudbury' },
            { day: 'Thu', town: 'Lincoln' },
            { day: 'Fri', town: 'Carlisle' },
          ],
          townCta: 'Book a Same-Day Visit',
          fallback: 'Town not listed? Book a standard free assessment',
        },
      },
      zh: {
        title: '本周与我们见面',
        subtitle:
          '不用反复邮件来回。本周就能和我们见面——来 Burlington 体验日，或者搭我们安装路上的顺风车。',
        demoDay: {
          title: '每周体验日 · 马萨州 Burlington',
          time: '每周六 · 上午 10:00 – 下午 2:00（东部时间）',
          invite:
            '亲临我们的体验场地。看机器人在真实的新英格兰草坪上工作——坡地、石墙、各种地形一应俱全。带着问题来，带着答案走。',
          note: '完全免费 · 无需预约即可来，但提前登记我们准备得更周到。',
          cta: '登记参观时间',
        },
        routes: {
          title: '本周我们将出现在…',
          subtitle:
            '如果我们本周本来就要去你所在的城镇安装，我们可以顺路来你家做一次免费评估——不需要专门跑一趟。',
          towns: [
            { day: '周一', town: '康科德' },
            { day: '周三', town: '萨德伯里' },
            { day: '周四', town: '林肯' },
            { day: '周五', town: '卡莱尔' },
          ],
          townCta: '预约当日顺路评估',
          fallback: '你的城镇不在本周路线？预约标准的免费评估',
        },
      },
    },
  },
  // 4. How it works
  {
    type: 'how_it_works',
    config: { bg: 'brand-light' },
    content: {
      en: {
        title: 'How It Works',
        subtitle: 'From first call to a self-mowing lawn — in four steps.',
        steps: [
          { title: 'Schedule a Consultation', desc: "Tell us about your property online. We'll confirm coverage and book a free on-site visit." },
          { title: 'On-Site Assessment', desc: 'We walk your lawn, measure terrain, check WiFi, and recommend the right robot — no pressure, no obligation.' },
          { title: 'Installation & Setup', desc: 'We install the RTK station, map your lawn, set no-go zones, and tune the robot to your terrain.' },
          { title: 'Ongoing Care', desc: 'Optional SmartLawn Membership keeps your robot serviced, updated, and ready every season.' },
        ],
        cta: 'Ready to start? Book your free assessment',
      },
      zh: {
        title: '工作原理',
        subtitle: '从一次咨询，到自动割草——全程四步。',
        steps: [
          { title: '在线咨询预约', desc: '在线告诉我们你的地块情况，我们确认服务范围后安排免费上门时间。' },
          { title: '上门评估', desc: '我们上门勘察你的地块、测量地形、确认 WiFi 条件，并推荐最合适的机器人——无任何购买压力。' },
          { title: '安装与部署', desc: '我们安装 RTK 基站、绘制地图、设置禁入区，并按你的地形调试机器人。' },
          { title: '长期托管', desc: '可选加入 SmartLawn 会员，全季节维护、固件更新、随时响应。' },
        ],
        cta: '准备好了？预约免费评估',
      },
    },
  },
  // 5. Customer types
  {
    type: 'customer_types',
    content: {
      en: {
        title: 'Built for Your Kind of Land',
        subtitle: 'We work with three kinds of properties across Eastern Massachusetts.',
        cards: [
          { title: 'Large Suburban Yards', area: '1–5 acres', pains: ['No more weekend mowing.', 'Cut the cost of weekly landscape crews.'], cta: 'Is My Yard a Fit?' },
          { title: 'Hobby Farms & Orchards', area: '5–20 acres', pains: ['Keep paddocks, orchards, and trails trimmed without burning daylight.', 'Robotic mowers handle uneven, sloped terrain.'], cta: 'Explore Farm Solutions' },
          { title: 'Country & Rural Properties', area: 'Mixed terrain · woodland edges', pains: ['Manage the open areas around your house and let the woods stay wild.', "Designed for New England's stone walls, slopes, and roots."], cta: 'Talk to a Specialist' },
        ],
      },
      zh: {
        title: '为你的地块而生',
        subtitle: '我们为东马萨地区的三类地块提供服务。',
        cards: [
          { title: '大型郊区庭院', area: '1–5 英亩（约 4,000–20,000 平米）', pains: ['再也不用占用周末时间割草。', '省下每周景观工人的人工费。'], cta: '我的庭院适合吗？' },
          { title: '小型农场与果园', area: '5–20 英亩', pains: ['牧场、果园、小径自动修剪，节省宝贵的白天时间。', '智能机器人可应对不平坦与坡地。'], cta: '了解农场方案' },
          { title: '乡村住宅与林边物业', area: '混合地形 · 林缘地块', pains: ['管好房屋周边开阔区域，让林地保持自然。', '针对新英格兰的石墙、坡道与树根地形优化。'], cta: '与顾问交谈' },
        ],
      },
    },
  },
  // 6. Membership
  {
    type: 'membership',
    config: { bg: 'brand-dark' },
    content: {
      en: {
        title: 'SmartLawn Membership',
        subtitle: 'Keep your robotic mower running like new — all season, every season.',
        price: '$80',
        priceUnit: '/month',
        priceNote: 'Cancel anytime. Annual option available.',
        benefits: ['Priority service & response', 'Remote diagnostics & firmware updates', 'Seasonal maintenance reminders', 'Discounts on parts & accessories', 'Winterization included'],
        cta: 'Learn More About Membership',
      },
      zh: {
        title: 'SmartLawn 会员订阅',
        subtitle: '让你的割草机器人始终保持最佳状态——全年、全季无忧。',
        price: '$80',
        priceUnit: '/月',
        priceNote: '随时取消。可选年付方案。',
        benefits: ['优先服务与响应', '远程诊断与固件升级', '季节维护提醒', '配件与升级件折扣', '免费冬季封存服务'],
        cta: '了解会员详情',
      },
    },
  },
  // 7. Testimonials / Founder's Promise
  {
    type: 'testimonials',
    content: {
      en: {
        title: 'What Our Neighbors Say',
        subtitle: 'Real people. Real lawns. Real results across Eastern Massachusetts.',
        founderPromise: {
          title: 'A Promise from Our Founder',
          body: "We're a small, locally owned team starting out in Eastern Massachusetts. That means every customer matters, every install gets our full attention, and every problem gets a personal response. We'd rather earn one neighbor at a time than chase scale we can't deliver on.",
          signature: '— DS SmartLawn Service, Founder',
        },
        reviews: [
          { body: 'They walked our 2-acre lot with us before recommending anything. Felt like talking to a neighbor, not a salesman.', author: 'M.R., Concord, MA' },
          { body: "Our weekends are ours again. The robot just works, and DS is one call away if it doesn't.", author: 'J.K., Sudbury, MA' },
          { body: "They understood our orchard layout immediately. Setup took half a day, and we haven't touched it since.", author: 'D.P., Carlisle, MA' },
        ],
      },
      zh: {
        title: '邻居们的真实评价',
        subtitle: '真实的人、真实的草坪、真实的成果——遍布东马萨地区。',
        founderPromise: {
          title: '创始人承诺',
          body: '我们是一支扎根东马萨的本地小团队。这意味着每一位客户都重要、每一次安装都全心投入、每一个问题都由我们亲自回应。我们宁可一户一户地赢得邻居的信任，也不追求难以兑现的规模。',
          signature: '— DS SmartLawn Service 创始人',
        },
        reviews: [
          { body: '他们先和我们一起走完整个 2 英亩的地块，才给出方案。感觉像在和邻居聊天，而不是销售。', author: 'M.R.，马萨州康科德' },
          { body: '我们又拥有了完整的周末。机器人安静工作，万一出问题打个电话 DS 就来。', author: 'J.K.，马萨州萨德伯里' },
          { body: '他们一眼就理解了我们果园的布局。半天就完成了安装，之后再没碰过。', author: 'D.P.，马萨州卡莱尔' },
        ],
      },
    },
  },
  // 8. Service area
  {
    type: 'service_area',
    config: { bg: 'brand-light' },
    content: {
      en: {
        title: 'Where We Work',
        subtitle: 'Based in Eastern Massachusetts. We come to you.',
        mapNote: 'Currently serving these towns and surrounding areas:',
        towns: ['Concord', 'Sudbury', 'Lincoln', 'Wayland', 'Weston', 'Carlisle', 'Acton', 'Lexington', 'Bedford', 'Stow', 'Boxborough', 'Harvard'],
        edgeNote: "Don't see your town? Reach out — we may still be able to help.",
        cta: 'Check My Address',
      },
      zh: {
        title: '服务区域',
        subtitle: '总部位于东马萨地区。我们上门服务。',
        mapNote: '目前服务以下城镇及周边地区：',
        towns: ['康科德', '萨德伯里', '林肯', '韦兰', '韦斯顿', '卡莱尔', '阿克顿', '列克星敦', '贝德福德', '斯托', '博克斯伯勒', '哈佛'],
        edgeNote: '没找到你所在的城镇？联系我们——也许我们仍然可以帮你。',
        cta: '查询我的地址',
      },
    },
  },
  // 9. Final CTA
  {
    type: 'final_cta',
    config: { bg: 'brand-dark' },
    content: {
      en: {
        title: "Let's Walk Your Lawn Together.",
        subtitle: 'Free on-site assessment. No pressure, no obligation, no salesperson tactics.',
        cta: 'Book My Free Assessment',
      },
      zh: {
        title: '我们一起，先看看你的草坪。',
        subtitle: '免费上门评估。无购买压力、无强制承诺、无销售套路。',
        cta: '预约我的免费评估',
      },
    },
  },
];
