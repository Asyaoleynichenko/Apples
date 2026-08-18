import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { StoreProvider, useStore, type NavKind, type Route } from './lib/store';
import Onboarding from './screens/Onboarding';
import Chat from './screens/Chat';
import Pdp from './screens/Pdp';
import Sheets from './screens/Sheets';
import { Cart, Favorites, Profile, Search } from './screens/Shop';

const MODAL_ROUTES = new Set(['chat', 'onboarding']);
/** iOS UIViewAnimationCurve — push/pop and coverVertical. */
const IOS_EASE = [0.32, 0.72, 0, 1] as const;
const PUSH_MS = 0.4;
const TAB_MS = 0.22;
const MODAL_MS = 0.42;

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
    if (kind === 'tab' || kind === 'expand') return { x: 0, opacity: 0 };
    if (kind === 'back') return { x: '-22%', zIndex: 0 };
    return { x: '100%', zIndex: 2 };
  },
  animate: (kind: NavKind) => {
    if (kind === 'tab' || kind === 'expand') {
      return { x: 0, opacity: 1, transition: { duration: TAB_MS, ease: IOS_EASE } };
    }
    return {
      x: 0,
      opacity: 1,
      zIndex: kind === 'back' ? 0 : 1,
      transition: { duration: PUSH_MS, ease: IOS_EASE },
    };
  },
  exit: (kind: NavKind) => {
    if (kind === 'tab' || kind === 'expand') {
      return { opacity: 0, transition: { duration: TAB_MS, ease: IOS_EASE } };
    }
    if (kind === 'back') {
      return {
        x: '100%',
        zIndex: 2,
        transition: { duration: PUSH_MS, ease: IOS_EASE },
      };
    }
    return { x: '-22%', zIndex: 0, transition: { duration: PUSH_MS, ease: IOS_EASE } };
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
  const fromExpand = navKind === 'expand';

  return (
    <>
      <motion.div
        className="shop-stack"
        animate={
          modal && !fromExpand
            ? { scale: 0.94, y: 10, opacity: 0.9 }
            : { scale: 1, y: 0, opacity: 1 }
        }
        transition={{ duration: fromExpand ? 0 : MODAL_MS, ease: IOS_EASE }}
        style={{ pointerEvents: modal ? 'none' : 'auto' }}
      >
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
      </motion.div>

      <AnimatePresence>
        {modal && (
          <motion.div
            key="assistant"
            className="route route--modal"
            initial={fromExpand ? { y: 0 } : { y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={fromExpand ? { duration: 0 } : { duration: MODAL_MS, ease: IOS_EASE }}
          >
            <AnimatePresence initial={false}>
              <motion.div
                key={modal.name}
                className="route-fade"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: TAB_MS, ease: IOS_EASE }}
              >
                {modal.name === 'chat' ? <Chat /> : <Onboarding />}
              </motion.div>
            </AnimatePresence>
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
