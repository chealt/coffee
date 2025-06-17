const isIOS = () => {
  const userAgent = window.navigator.userAgent.toLowerCase();
  const platform = window.navigator.platform.toLowerCase();

  return /iphone|ipad|ipod/u.test(userAgent) || (platform === 'macintel' && window.navigator.maxTouchPoints > 1); // For iPads on iPadOS 13+
};

export { isIOS };
