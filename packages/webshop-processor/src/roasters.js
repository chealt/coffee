// eslint-disable-next-line import/no-unresolved
import roasters from '../data/roasters.json' with { type: 'json' };

const getRoaster = (webshop) => roasters.find((roaster) => roaster.webshop === webshop);

export { getRoaster };
