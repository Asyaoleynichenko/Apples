import { AnimatePresence, motion } from 'framer-motion';
import { useState } from 'react';
import { StatusBar } from '../components/Chrome';
import { ChevronDown, ChevronLeft, Close, Scan, Search as SearchIcon, Sliders, Sort } from '../components/Icons';
import { Button, ProductCard } from '../components/UI';
import { Pill } from '../components/Chat';
import { IosKeyboard } from '../components/Keyboard';
import { CATALOG, PRODUCTS } from '../data/products';
import { useStore } from '../lib/store';
import { useLiveShell } from '../lib/shell';
import type { ProductType } from '../lib/types';

const PRIORITIES = [
  '✨ Эффект',
  '💸 Цена',
  '🧴 Состав',
  '🫧 Текстура',
  '💄 Бренд',
  '⭐ Отзывы',
  '🔥 Новинки и тренды',
  '🤷‍♀️ Не знаю',
];

const BUDGETS = ['до 2 000 ₽', '2 000–5 000 ₽', '5 000–10 000 ₽', 'больше 10 000 ₽', 'зависит от продукта', 'любая сумма'];

const DISLIKES = ['Сильные отдушки', 'бренды', 'Плотные текстуры', 'высокая цена', 'Определённые ингредиенты'];

const ROUTINE_FIELDS = [
  { key: 'foundation', label: 'тональная основа', value: 'Estee lauder' },
  { key: 'shampoo', label: 'шампунь', value: 'Davines' },
  { key: 'cream', label: 'крем', value: 'LA ROCHE-POSAY' },
  { key: 'care', label: 'уход', value: 'Celimax' },
] as const;

type RoutineKey = (typeof ROUTINE_FIELDS)[number]['key'];

const PICK: Record<
  RoutineKey,
  { types: ProductType[]; chips: string[]; brands: string[]; extras: string[] }
> = {
  foundation: {
    types: ['foundation'],
    chips: ['тональный', 'крем', 'консилер', 'double'],
    brands: ['ESTEE LAUDER', 'INSTITUT ESTHEDERM', 'FREDERIC MALLE', 'MAISON BERGER PARIS'],
    extras: ['тональный крем', 'консилер', 'double wear'],
  },
  shampoo: {
    types: ['mist'],
    chips: ['шампунь', 'для волос', 'кудри', 'мист'],
    brands: ['КУДРЯВЫЙ МЕТОД', 'DAVINES', 'TIGI BED HEAD'],
    extras: ['шампунь', 'для кудрей', 'мист'],
  },
  cream: {
    types: ['cream'],
    chips: ['крем', 'для тела', 'увлажняющий', 'упругость'],
    brands: ['ELEMIS', 'CLARINS', 'LA ROCHE-POSAY'],
    extras: ['для тела', 'увлажняющий', 'pro-collagen'],
  },
  care: {
    types: ['cleanser'],
    chips: ['уход', 'умывание', 'пенка', 'центрила'],
    brands: ['CELIMAX', 'LA ROCHE-POSAY', 'FOR ME BY GOLD APPLE'],
    extras: ['пенка', 'центрила', 'умывание'],
  },
};

type Picker = { field: RoutineKey; phase: 'search' | 'results'; query: string };

const SHADES = [
  ['1W1, Bone', '#efd8bd'],
  ['2C3, Fresco', '#e6bfa4'],
  ['2C2, Pale Almond', '#e8b99a'],
  ['3C2, Pebble', '#dfaa86'],
  ['4N1, Shell Beige', '#b98f6a'],
  ['3N1, Ivory Beige', '#e0a06a'],
  ['2N1, Desert Beige', '#f0cfa8'],
  ['5N1, Rich ginger', '#a86f45'],
  ['1C0, Shell', '#f3ddc4'],
  ['1N2, Ecru', '#f0c69b'],
  ['1W2, Sand', '#efc8a0'],
  ['3W1, Tawny', '#e0a163'],
  ['3N2, Wheat', '#c9a279'],
  ['2W1, Dawn', '#eeb984'],
  ['2C0, Cool vanilla', '#f7dfae'],
  ['1C1, Cool Bone', '#eec7a6'],
] as const;

type Step = 'intro' | 'priorities' | 'budget' | 'dislikes' | 'routine' | 'shade' | 'done';

const ORDER: Step[] = ['intro', 'priorities', 'budget', 'dislikes', 'routine', 'done'];

/** Onboarding answers become the machine-readable slots the engine filters on. */
const BUDGET_CEILING: Record<string, number | null> = {
  'до 2 000 ₽': 2000,
  '2 000–5 000 ₽': 5000,
  '5 000–10 000 ₽': 10000,
  'больше 10 000 ₽': null,
  'зависит от продукта': null,
  'любая сумма': null,
};

export default function Onboarding() {
  const { setProfile, setConversation, conversation, resetTo, replace } = useStore();
  const [step, setStep] = useState<Step>('intro');
  const [priorities, setPriorities] = useState<string[]>([]);
  const [budget, setBudget] = useState<string | null>(null);
  const [dislikes, setDislikes] = useState<string[]>([]);
  const [routine, setRoutine] = useState<Record<string, string>>(
    Object.fromEntries(ROUTINE_FIELDS.map((f) => [f.key, f.value])),
  );
  const [pickedIds, setPickedIds] = useState<Partial<Record<RoutineKey, string>>>({});
  const [picker, setPicker] = useState<Picker | null>(null);
  const [shade, setShade] = useState<string | null>(null);

  const goNext = () => {
    const i = ORDER.indexOf(step);
    if (step === 'shade') return setStep('routine');
    setStep(ORDER[Math.min(i + 1, ORDER.length - 1)]);
  };
  const goBack = () => {
    if (step === 'shade') return setStep('routine');
    const i = ORDER.indexOf(step);
    if (i <= 0) return resetTo({ name: 'favorites' });
    setStep(ORDER[i - 1]);
  };

  const finish = (onboarded: boolean) => {
    const cleanPriorities = onboarded ? priorities.map(stripEmoji) : [];
    const cleanDislikes = onboarded ? dislikes.map((d) => d.toLowerCase()) : [];
    const budgetMax = onboarded && budget ? (BUDGET_CEILING[budget] ?? null) : null;

    setProfile({
      onboarded,
      metAssistant: true,
      priorities: cleanPriorities,
      budget: onboarded ? budget : null,
      budgetMax,
      dislikes: cleanDislikes,
      routine,
      shade,
      learned: onboarded
        ? [
            priorities.length ? `Важно: ${cleanPriorities.join(', ').toLowerCase()}` : '',
            budget ? `Бюджет: ${budget}` : '',
            dislikes.length ? `Не подходит: ${cleanDislikes.join(', ')}` : '',
            shade ? `Оттенок тона: ${shade}` : '',
            ...ROUTINE_FIELDS.map((f) => (routine[f.key] ? `${f.label}: ${routine[f.key]}` : '')),
          ].filter(Boolean)
        : [],
    });

    // Carry the answers into the live conversation so the first recommendation
    // already respects them instead of asking the same questions again.
    setConversation({
      state: 'IDLE',
      slots: {
        ...conversation.slots,
        priority: cleanPriorities[0] ?? null,
        budgetMax,
        budgetLabel: onboarded ? budget : null,
        avoid: cleanDislikes,
      },
    });

    replace({ name: 'chat' }, 'expand');
  };

  const toggle = (list: string[], set: (v: string[]) => void, item: string) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  if (picker) {
    return (
      <ProductPicker
        picker={picker}
        selectedId={pickedIds[picker.field]}
        onQuery={(query) => setPicker({ ...picker, query })}
        onPhase={(phase) => setPicker({ ...picker, phase })}
        onBack={() => {
          if (picker.phase === 'results') setPicker({ ...picker, phase: 'search' });
          else setPicker(null);
        }}
        onSave={(id) => {
          const p = PRODUCTS[id];
          setRoutine({ ...routine, [picker.field]: p.name });
          setPickedIds({ ...pickedIds, [picker.field]: id });
          const field = picker.field;
          setPicker(null);
          if (field === 'foundation') setStep('shade');
        }}
      />
    );
  }

  if (step === 'shade') {
    return (
      <ShadePicker
        current={shade}
        onPick={setShade}
        onSave={() => setStep('routine')}
        onBack={() => setStep('routine')}
      />
    );
  }

  return (
    <div className="screen onb">
      <StatusBar />
      <div className="onb__header">
        <button className="onb__back press" onClick={goBack} aria-label="Назад">
          <ChevronLeft color="var(--onb-back-arrow)" />
        </button>
      </div>

      <div className="onb__stage">
      <AnimatePresence initial={false} mode="wait">
        <motion.div
          key={step}
          className="onb__body"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        >
          {step === 'intro' && (
            <>
              <div className="onb__art onb__art--tall">
                <img src="/assets/mascot-phone.png" alt="" />
              </div>
              <div className="onb__texts">
                <div className="t-headline-24">я твой личный ассистент{'\n'}давай познакомимся</div>
                <div className="t-body-16">
                  Расскажи немного о себе — и я буду подбирать косметику с учётом твоих предпочтений
                </div>
              </div>
              <div className="button-group">
                <Button onClick={() => setStep('priorities')}>давай</Button>
                <Button variant="ghost" onClick={() => finish(false)}>
                  пройду позже
                </Button>
              </div>
            </>
          )}

          {step === 'priorities' && (
            <StepChips
              title={'что для тебя важно\nпри выборе косметики?'}
              art="/assets/mascot-eyes-closed.png"
              label="Можно выбрать несколько"
              items={PRIORITIES}
              selected={priorities}
              onToggle={(i) => toggle(priorities, setPriorities, i)}
              onNext={goNext}
            />
          )}

          {step === 'budget' && (
            <StepChips
              title="твой бюджет"
              art="/assets/mascot-waving.png"
              artClass="onb__art--wave"
              label="На какую сумму в месяц обычно рассчитываешь?"
              items={BUDGETS}
              selected={budget ? [budget] : []}
              onToggle={(i) => setBudget(i === budget ? null : i)}
              onNext={goNext}
            />
          )}

          {step === 'dislikes' && (
            <StepChips
              title="что точно не твоё"
              art="/assets/mascot-arms-open.png"
              label={'А есть что тебе точно не нравится?\nМожно выбрать несколько'}
              items={DISLIKES}
              selected={dislikes}
              onToggle={(i) => toggle(dislikes, setDislikes, i)}
              onNext={goNext}
            />
          )}

          {step === 'routine' && (
            <>
              <div className="onb__title t-headline-24">продукты, которые используешь 24/7</div>
              <div className="onb__art onb__art--head">
                <div className="onb__banner">
                  <img src="/assets/banner-onboarding.png" alt="" />
                </div>
              </div>
              <div className="onb__fields">
                {ROUTINE_FIELDS.map((f) => (
                  <div key={f.key} className="onb__field">
                    <div className="t-title-17">{f.label}</div>
                    <button
                      className="onb__input press"
                      onClick={() =>
                        setPicker({ field: f.key, phase: 'search', query: routine[f.key] || f.value })
                      }
                    >
                      <span className="t-body-16">{routine[f.key] || 'выбрать'}</span>
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          setRoutine({ ...routine, [f.key]: '' });
                        }}
                      >
                        <Close size={16} color="#9b9b9b" />
                      </span>
                    </button>
                  </div>
                ))}
                {shade && <div className="onb__shade-note t-body-14">оттенок: {shade}</div>}
              </div>
              <div className="button-group">
                <Button onClick={goNext}>далее</Button>
              </div>
            </>
          )}

          {step === 'done' && (
            <>
              <div className="onb__texts onb__texts--top">
                <div className="t-headline-24">всё, познакомились 💚</div>
                <div className="t-body-16">
                  Теперь я буду учитывать твой вкус, бюджет и то, что тебе не подходит. Не понравится рекомендация
                  — скажи. Я запомню
                </div>
              </div>
              <div className="onb__art onb__art--tall">
                <img src="/assets/mascot-calm.png" alt="" />
              </div>
              <div className="button-group">
                <Button onClick={() => finish(true)}>начать</Button>
              </div>
            </>
          )}
        </motion.div>
      </AnimatePresence>
      </div>
    </div>
  );
}

function StepChips({
  title,
  art,
  artClass,
  label,
  items,
  selected,
  onToggle,
  onNext,
}: {
  title: string;
  art: string;
  artClass?: string;
  label: string;
  items: readonly string[];
  selected: string[];
  onToggle: (item: string) => void;
  onNext: () => void;
}) {
  return (
    <>
      <div className="onb__title t-headline-24">{title}</div>
      <div className={['onb__art', artClass].filter(Boolean).join(' ')}>
        <img src={art} alt="" />
      </div>
      <div className="onb__chips-block">
        <div className="t-title-17">{label}</div>
        <div className="onb__chips">
          {items.map((i) => (
            <Pill key={i} label={i} selected={selected.includes(i)} onClick={() => onToggle(i)} />
          ))}
        </div>
      </div>
      <div className="button-group">
        <Button onClick={onNext} disabled={!selected.length}>
          далее
        </Button>
      </div>
    </>
  );
}

function ShadePicker({
  current,
  onPick,
  onSave,
  onBack,
}: {
  current: string | null;
  onPick: (s: string) => void;
  onSave: () => void;
  onBack: () => void;
}) {
  const [q, setQ] = useState('');
  const list = SHADES.filter(([name]) => name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="screen shade">
      <StatusBar />
      <div className="shade__header">
        <button className="press" onClick={onBack} aria-label="Назад">
          <ChevronLeft />
        </button>
      </div>
      <div className="shade__search">
        <input
          className="t-body-16"
          placeholder="введите оттенок"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <SearchIcon size={24} color="#9b9b9b" />
      </div>
      <div className="shade__list scroll">
        {list.map(([name, color]) => (
          <button
            key={name}
            className={`shade__row press${current === name ? ' shade__row--on' : ''}`}
            onClick={() => onPick(name)}
          >
            <span className="shade__dot" style={{ background: color }} />
            <span className="t-body-16">{name}</span>
          </button>
        ))}
      </div>
      <div className="shade__actions">
        <Button onClick={onSave} disabled={!current}>
          сохранить выбор
        </Button>
        <Button variant="ghost" onClick={onBack}>
          вернуться назад
        </Button>
      </div>
    </div>
  );
}

const stripEmoji = (s: string) => s.replace(/[^\p{L}\p{N}\s—–-]/gu, '').trim();

function suggestionsFor(query: string, extras: string[]) {
  const q = query.trim() || extras[0];
  const rows = [q, ...extras.map((e) => (q.toLowerCase().includes(e.toLowerCase()) ? q : `${q} ${e}`))];
  return [...new Set(rows)];
}

function productsFor(field: RoutineKey, query: string) {
  const meta = PICK[field];
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  const typed = CATALOG.filter((p) => meta.types.includes(p.type));
  const searched = CATALOG.filter((p) => {
    const blob = `${p.brand} ${p.name} ${p.category}`.toLowerCase();
    return words.length > 0 && words.every((w) => blob.includes(w));
  });
  const ids = [...new Set([...searched, ...typed].map((p) => p.id))];
  return ids.length ? ids : typed.map((p) => p.id);
}

function highlight(text: string, query: string) {
  const q = query.trim();
  if (!q) return text;
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text;
  return (
    <>
      {text.slice(0, i)}
      <b>{text.slice(i, i + q.length)}</b>
      {text.slice(i + q.length)}
    </>
  );
}

function ProductPicker({
  picker,
  selectedId,
  onQuery,
  onPhase,
  onBack,
  onSave,
}: {
  picker: Picker;
  selectedId?: string;
  onQuery: (q: string) => void;
  onPhase: (phase: Picker['phase']) => void;
  onBack: () => void;
  onSave: (id: string) => void;
}) {
  const meta = PICK[picker.field];
  const live = useLiveShell();
  const [kb, setKb] = useState(picker.phase === 'search');
  const [chosen, setChosen] = useState(selectedId ?? null);
  const ids = productsFor(picker.field, picker.query);
  const suggestions = suggestionsFor(picker.query, meta.extras);

  const goResults = (q = picker.query) => {
    onQuery(q);
    onPhase('results');
    setKb(false);
  };

  if (picker.phase === 'results') {
    return (
      <div className="screen shop onb-pick">
        <StatusBar />
        <div className="shop__topbar shop__topbar--between">
          <button className="press" onClick={onBack} aria-label="Назад">
            <ChevronLeft />
          </button>
          <div className="onb-pick__title t-title-17">{picker.query}</div>
          <div className="onb-pick__tools">
            <button className="press" onClick={() => onPhase('search')} aria-label="Поиск">
              <SearchIcon />
            </button>
            <button className="press" aria-label="Сканировать">
              <Scan />
            </button>
          </div>
        </div>

        <div className="shop__scroll scroll">
          <div className="filters">
            <div className="onb-pick__tools">
              <button className="press" aria-label="Фильтры">
                <Sliders />
              </button>
              <button className="press" aria-label="Сортировка">
                <Sort />
              </button>
            </div>
            <div className="filters__count t-body-14">{ids.length} продуктов</div>
          </div>
          <div className="chips-row hscroll">
            <button className="chip chip--promo">⚡️ ЭКСПРЕСС</button>
            <button className="chip">
              ЦЕНА <ChevronDown size={16} />
            </button>
            <button className="chip">СРОК ДОСТАВКИ</button>
          </div>
          <div className="grid">
            {ids.map((id) => (
              <ProductCard key={id} productId={id} selected={chosen === id} onPick={() => setChosen(id)} />
            ))}
          </div>
          <div className="shop__pad" />
        </div>

        <div className="shade__actions">
          <Button onClick={() => chosen && onSave(chosen)} disabled={!chosen}>
            сохранить выбор
          </Button>
          <Button variant="ghost" onClick={onBack}>
            вернуться назад
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="screen shop onb-pick">
      <StatusBar />
      <div className="shop__topbar shop__topbar--between">
        <button className="press" onClick={onBack} aria-label="Назад">
          <ChevronLeft />
        </button>
        <button className="press" aria-label="Сканировать">
          <Scan />
        </button>
      </div>

      <div className="search-field">
        <input
          value={picker.query}
          onChange={(e) => onQuery(e.target.value)}
          onFocus={() => setKb(true)}
        />
        <button className="search-field__clear press" onClick={() => onQuery('')} aria-label="Очистить">
          <Close size={16} color="#fff" />
        </button>
      </div>

      <div className="chips-row chips-row--soft hscroll">
        {meta.chips.map((c) => (
          <button
            key={c}
            className="chip chip--soft"
            onClick={() => {
              const next = picker.query.toLowerCase().includes(c.toLowerCase()) ? picker.query : `${picker.query} ${c}`.trim();
              onQuery(next);
            }}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="search-list scroll" style={{ paddingBottom: live ? 80 : kb ? 280 : 80 }}>
        {suggestions.map((s) => (
          <button key={s} className="search-list__row press" onClick={() => goResults(s)}>
            {highlight(s, picker.query)}
          </button>
        ))}
        <div className="search-list__brands">
          {meta.brands.map((b) => (
            <button key={b} className="search-list__brand press" onClick={() => goResults(b)}>
              {b}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence>
        {kb && !live && (
          <IosKeyboard
            onKey={(ch) => onQuery(picker.query + ch)}
            onBackspace={() => onQuery(picker.query.slice(0, -1))}
            onSubmit={() => goResults()}
            submitLabel="search"
          />
        )}
      </AnimatePresence>
    </div>
  );
}
