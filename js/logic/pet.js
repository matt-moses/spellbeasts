// A shuffle bag: every item comes up once before any repeats, and never the same item twice in a row.
export function createRotation(items, rng = Math.random) {
  let bag = [], last;
  const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  return {
    next() {
      if (!bag.length) {
        bag = shuffle([...items]);
        if (bag.length > 1 && bag[0] === last) bag.push(bag.shift());
      }
      last = bag.shift();
      return last;
    },
  };
}
