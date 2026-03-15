export const siteData = {
  title: "Wild Remote",
  logo: "/images/WILD_REMOTE_LOGO_HORIZ.png",
  logoWhite: "/images/WILD_REMOTE_LOGO_HORIZ_WHITE.png",
  author: "Wild Remote",
  description: "Home of Wild Remote.",
  footerTagline: "Builders and doers. Proudly based in the USA.",

  menu: [
    { title: "Home", url: "/" },
    { title: "Contact", url: "/contact/" },
  ],

  hero: {
    title: "Small. Business.",
    description:
      "At Wild Remote, we're builders and doers working to preserve the human scale in great cities, deep technology, and business.",
    ctaText: "Get In Touch",
    ctaUrl: "/contact/",
    bannerText:
      "Preserving the human scale in enterprise, technology, and community",
  },

  mission: {
    title: "The Backbone of America",
    description:
      "Amidst the web of American enterprise, small businesses stand out as vital contributors, embodying the essence of local economies. Crafted by calloused hands and unwavering spirit, they offer not merely goods and services but a piece of their own story.",
    stats: [
      { number: "6M+", label: "Small Businesses in the U.S." },
      { number: "47%", label: "Of U.S. Employment" },
      { number: "44%", label: "Of U.S. GDP" },
    ],
  },

  values: {
    title: "How We Work",
    description:
      "Each enterprise is a pursuit of passion. Each exchange is a connection that extends beyond transaction.",
    items: [
      {
        title: "Build With Purpose",
        description:
          "We partner with organizations that value craftsmanship, community, and long-term impact over short-term gains.",
      },
      {
        title: "Preserve the Human Scale",
        description:
          "We believe great cities and great businesses are built by people who care deeply about the work and the communities they serve.",
      },
      {
        title: "Think Across Scales",
        description:
          "From the molecular to the territorial, we bring creative and pragmatic approaches to complex infrastructural and business challenges.",
      },
    ],
  },

  teamShowcase: {
    title: "Our Team",
    subtitle:
      "A diverse group of builders, designers, and operators driving impact.",
    members: [
      {
        name: "Aaron David Mendonca",
        image: "/images/aaron.jpg",
        role: "Innovation & Corporate Development",
        bio: "Leverages expertise in architecture, energy, and business development. Former Head of BD at WeWork Construction Innovation.",
      },
      {
        name: "Adalberto Avila",
        image: "/images/beto.jpg",
        role: "Design & Media",
        bio: "Seasoned motion graphics designer at NBCUniversal Telemundo. Expert in broadcast design, 3D animation, and creative strategy.",
      },
      {
        name: "Tim Dumatrait",
        image: "/images/tim.jpg",
        role: "Technology & Construction",
        bio: "Passionate craftsperson and systems thinker with 15 years driving creative design and technology solutions across product and construction.",
      },
    ],
  },

  cta: {
    title: "Work With Us",
    description:
      "Whether you're looking to build, partner, or explore new opportunities, we'd love to hear from you.",
    buttonText: "Get Started",
    buttonUrl: "/contact/",
  },

  contact: {
    description: "Want to work with Wild Remote? Contact us here.",
    formAction: "https://formspree.io/f/mwkgpolv",
  },
} as const;
