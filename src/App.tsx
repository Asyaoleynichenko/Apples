import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { StoreProvider, useStore, type NavKind, type Route } from './lib/store';
import Onboarding from './screens/Onboarding';
import Chat from './screens/Chat';
import Pdp from './screens/Pdp';
import Sheets from './screens/Sheets';
import { Cart, Favorites, Profile, Search } from './screens/Shop';

const MODAL_ROUTES = new Set(['chat', 'onboarding']);
const EASE = [0.32, 0.72, 0, 1] as const;
const PUSH_MS = 0.42;
const TAB_MS = 0.22;
const MODAL_MS = 0.44;

type ShopRoute = Exclude<Route, { name: 'chat' } | { name: 'onboarding' }>;

function isShop(route: Route): route is ShopRoute {
  return !MODAL_ROUTES.has(route.name);
}

function shopKey(route: ShopRoute) {
  return route.name === 'pdp' ? `pdp-${route.productId}` : route.name;
}

function ShopScreen({ route }: { route: ShopRoute }) {
  if (route.name === 'search') return <Search />;
  if (route.name === 'cart') return <Cart />;
  if (route.name === 'profile') return <Profile />;
  if (route.name === 'pdp') return <Pdp productId={route.productId} />;
  return <Favorites />;
}

const shopMotion: Variants = {
  initial: (kind: NavKind) => {
    if (kind === 'tab') return { opacity: 0 };
    if (kind === 'back') return { x: '-28%', zIndex: 0 };
    return { x: '100%', zIndex: 2, boxShadow: '-16px 0 40px rgba(0, 16, 61, 0.18)' };
  },
  animate: (kind: NavKind) => {
    if (kind === 'tab') return { opacity: 1, x: 0, transition: { duration: TAB_MS, ease: EASE } };
    return {
      x: 0,
      opacity: 1,
      zIndex: kind === 'back' ? 0 : 1,
      boxShadow: '0 0 0 rgba(0, 16, 61, 0)',
      transition: { duration: PUSH_MS, ease: EASE },
    };
  },
  exit: (kind: NavKind) => {
    if (kind === 'tab') return { opacity: 0, transition: { duration: TAB_MS, ease: EASE } };
    if (kind === 'back') {
      return {
        x: '100%',
        zIndex: 2,
        boxShadow: '-16px 0 40px rgba(0, 16, 61, 0.18)',
        transition: { duration: PUSH_MS, ease: EASE },
      };
    }
    return { x: '-28%', zIndex: 0, transition: { duration: PUSH_MS, ease: EASE } };
  },
};

function Router() {
  const { stack, navKind } = useStore();
  const top = stack[stack.length - 1];
  const shopRoute = [...stack].reverse().find(isShop) ?? { name: 'favorites' as const };
  // Chat sits over the shop until a shop route is pushed on top — then the
  // product / cart must actually appear, otherwise "выбрать" from comparison
  // never leaves the assistant.
  const modal = top && MODAL_ROUTES.has(top.name) ? top : undefined;

  return (
    <>
      <AnimatePresence initial={false} custom={navKind}>
        <motion.div
          key={shopKey(shopRoute)}
          className="route"
          custom={navKind}
          variants={shopMotion}
          initial="initial"
          animate="animate"
          exit="exit"
        >
          <ShopScreen route={shopRoute} />
        </motion.div>
      </AnimatePresence>

      <AnimatePresence custom={navKind}>
        {modal && (
          <motion.div
            key={modal.name}
            className="route route--modal"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: MODAL_MS, ease: EASE }}
          >
            {modal.name === 'chat' ? <Chat /> : <Onboarding />}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

function Device() {
  const { restart } = useStore();
  return (
    <div className="stage">
      <div className="device">
        <Router />
        <Sheets />
      </div>
      <button className="stage__restart" onClick={restart}>
        начать демо заново
      </button>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <Device />
    </StoreProvider>
  );
}
