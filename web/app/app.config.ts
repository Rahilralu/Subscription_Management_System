// Central look and feel. Pages use plain Nuxt UI components, so changing a theme here restyles every page.
export default defineAppConfig({
  ui: {
    colors: {
      primary: 'brand',
      neutral: 'zinc',
    },

    card: {
      slots: {
        // a table inside a card drops its own surface, so there is no card-in-card look
        root: 'rounded-xl overflow-hidden shadow-(--shadow-card) [&_div:has(>table)]:rounded-none [&_div:has(>table)]:shadow-none [&_div:has(>table)]:ring-0',
        header: 'p-4 sm:px-5',
        body: 'p-4 sm:p-5',
        footer: 'p-4 sm:px-5',
        title: 'text-highlighted font-semibold tracking-tight',
      },
    },

    button: {
      slots: {
        base: 'active:translate-y-px',
      },
    },

    badge: {
      slots: {
        base: 'font-medium',
      },
    },

    table: {
      slots: {
        root: 'rounded-xl bg-default ring ring-default shadow-(--shadow-card)',
        // calmer header row, comfortable body rows
        th: 'px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted text-start',
        td: 'px-4 py-3.5 text-sm text-default whitespace-nowrap',
        tbody: '[&>tr]:data-[selectable=true]:hover:bg-elevated/60 [&>tr]:data-[selectable=true]:cursor-pointer divide-y divide-default',
      },
    },

    modal: {
      slots: {
        overlay: 'bg-elevated/70 backdrop-blur-sm',
        content: 'rounded-2xl shadow-(--shadow-lift) ring ring-default',
      },
    },

    slideover: {
      slots: {
        overlay: 'bg-elevated/70 backdrop-blur-sm',
        content: 'shadow-(--shadow-lift)',
      },
    },

    empty: {
      slots: {
        root: 'rounded-xl py-10',
        title: 'text-base',
      },
    },

    dashboardSidebar: {
      slots: {
        root: 'bg-default border-e border-default',
        header: 'px-4',
        body: 'px-3 py-3 gap-5',
        footer: 'px-3 py-3 border-t border-default',
      },
    },

    dashboardNavbar: {
      slots: {
        root: 'bg-default/80 backdrop-blur border-b border-default',
        title: 'text-base tracking-tight',
      },
    },

    dashboardPanel: {
      slots: {
        body: 'gap-5 sm:gap-6 p-4 sm:p-6 lg:p-8',
      },
    },

    navigationMenu: {
      slots: {
        label: 'text-[11px] uppercase tracking-wider text-dimmed font-medium px-2.5 pt-2 pb-1',
        link: 'rounded-lg',
      },
    },
  },
})
