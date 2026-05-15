export const userAgent = {
  mobile: /iPhone|iPad|iPod|Android/i.test(navigator.userAgent),
  firefox: navigator.userAgent.includes("Firefox"),
  safari: /^((?!chrome|android).)*safari/i.test(navigator.userAgent),
  chrome: /^((?!chrome|android).)*chrome/i.test(navigator.userAgent),
};
