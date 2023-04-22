export default {
  name: 'redm',
  logo: 'images/txadmin-redm.png',
  palette: {
    mode: "dark",
    primary: {
      // main: "#F7DC6F",
      main: "#F4D03E", //darker
    },
    success: {
      // main: "#82E0AA",
      main: "#57D58D", //darker
    },
    warning: {
      // main: "#F5B041",
      main: "#F39C12", //darker
    },
    error: {
      // main: "#E74C3C",
      main: "#D52C1A", //darker
    },
    info: {
      // main: "#85C1E9",
      main: "#5BACE1", //darker
    },
    background: {
      default: "#332E27",
      paper: "#4B3B2E",
    },
    action: {
      selected: "rgba(255, 255, 255, 0.08)",
    },
    secondary: {
      // main: "#D6A2E8",
      main: "#BB64D9", //darker
    },
    text: {
      primary: "#E8E1DC",
      secondary: "#E6D5C9",
    },
  },
  components: {
    MuiListItem: {
      styleOverrides: {
        root: {
          "&.Mui-selected": {
            backgroundColor: "rgba(255, 255, 255, 0.08)",
          },
        },
      },
    },
    MuiPaper: { styleOverrides: { root: { backgroundImage: "unset" } } },
  },
} as const;
