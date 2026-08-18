import { AnimatePresence, motion, type Variants } from 'framer-motion';
import { useLiveShell } from './lib/shell';
import { useHScrollDrag } from './lib/hscroll';
import { asset } from './lib/asset';
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

const TELEGRAM = 'https://t.me/pnkprty';
const FIGMA =
  'https://www.figma.com/design/QUmYjklBOEq4LUDxWsv8r9/11.08.26-%F0%9F%8D%8F--Copy-?node-id=55-9703';

function Device() {
  const { restart } = useStore();
  useLiveShell();
  useHScrollDrag();
  return (
    <div className="stage" style={{ backgroundImage: `url(${asset('stage-bg.jpg')})` }}>
      <button type="button" className="stage-chip stage-chip--restart" onClick={restart}>
        Начать заново
      </button>
      <a className="stage-chip stage-chip--msg" href={TELEGRAM} target="_blank" rel="noopener noreferrer">
        Написать мне
      </a>
      <a className="stage-chip stage-chip--figma" href={FIGMA} target="_blank" rel="noopener noreferrer">
        Figma
      </a>
      <div className="device-slot">
        <div className="device">
          <Router />
          <Sheets />
        </div>
      </div>
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
