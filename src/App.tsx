import { useEffect, useMemo, useRef, useState } from 'react';
import { CATEGORIES, findMatches, maskValue } from './core/redact';
import {
  useBoot,
  usePointerGlow,
  useReducedMotion,
  useReveal,
  useScrollProgress,
} from './lib/motion';

const ZIP = '/redact-0.1.0.zip';
const REPO = 'https://github.com/ish1416/redact';

interface DemoRow {
  label: string;
  value: string;
  sensitive: boolean;
}

const DEMO_ROWS: DemoRow[] = [
  { label: 'Customer', value: 'Priya Raman', sensitive: false },
  { label: 'Email', value: 'priya.raman@northwind.co', sensitive: true },
  { label: 'Card on file', value: '4242 4242 4242 4242', sensitive: true },
  { label: 'Payment intent', value: 'pi_3NxQ8K2eZvKYlo2C', sensitive: false },
  { label: 'Secret key', value: 'sk_live_51NxQ8K2eZvKYlo2C', sensitive: true },
  { label: 'Webhook secret', value: 'whsec_9f3c2b7a41d8e6f0', sensitive: true },
  { label: 'Session', value: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.7mQ2c9', sensitive: true },
  { label: 'Payout account', value: 'GB82 WEST 1234 5698 7654 32', sensitive: true },
];

const maskFor = (value: string) => {
  const matches = findMatches(value);
  return matches.length > 0 ? maskValue(value) : null;
};

const COVERAGE = CATEGORIES.map((category) => {
  const masked = maskFor(category.sample);
  return { ...category, masked: masked ?? category.sample, found: masked !== null };
});

function DemoPanel() {
  const reduced = useReducedMotion();
  const [pass, setPass] = useState(0);
  const [running, setRunning] = useState(true);
  const targets = useMemo(() => DEMO_ROWS.filter((row) => maskFor(row.value)), []);
  const total = targets.length;

  useEffect(() => {
    if (!running) return;
    if (reduced) {
      setPass(total);
      return;
    }
    const id = setInterval(() => {
      setPass((current) => {
        if (current >= total + 1) return 0;
        return current + 1;
      });
    }, 620);
    return () => clearInterval(id);
  }, [running, reduced, total]);

  const hidden = Math.min(pass, total);
  const scanning = running && !reduced && pass <= total;
  let seen = 0;

  return (
    <div className="demo-wrap" data-reveal>
      <div className="demo-chrome">
        <span className="demo-dots" aria-hidden="true">
          <i /> <i /> <i />
        </span>
        <span className="demo-url">dashboard.stripe.com/customers/northwind-co</span>
        <span className="demo-live">
          <span className="pulse" aria-hidden="true" /> live tab
        </span>
      </div>

      <div className="demo-panel">
        {scanning && <span className="scan" aria-hidden="true" />}
        <div className="demo-head">
          <div>
            <p className="demo-eyebrow">Customer</p>
            <p className="demo-title">Northwind Co.</p>
          </div>
          <span className="demo-badge">Test data · sample</span>
        </div>

        <dl className="demo-rows">
          {DEMO_ROWS.map((row) => {
            const masked = maskFor(row.value);
            const isTarget = masked !== null;
            if (isTarget) seen += 1;
            const isHidden = isTarget && seen <= hidden;
            return (
              <div
                className={`demo-row${isHidden ? ' is-hidden' : ''}`}
                key={row.label}
              >
                <dt>{row.label}</dt>
                <dd>
                  <span className={isHidden ? 'tape' : 'raw'}>{isHidden ? masked : row.value}</span>
                </dd>
                <span className={`demo-flag${isHidden ? ' on' : ''}`}>
                  {isTarget ? (isHidden ? 'hidden' : 'visible') : 'clear'}
                </span>
              </div>
            );
          })}
        </dl>

        <div className="demo-foot">
          <p>
            <strong>{hidden}</strong> of {total} hidden
            <span className="demo-sep" aria-hidden="true">·</span>
            <span className="demo-net">0 sent</span>
          </p>
          <div className="demo-buttons">
            <button
              type="button"
              className="demo-btn"
              onClick={() => setRunning((value) => !value)}
              aria-pressed={!running}
            >
              {running ? 'Pause' : 'Play'}
            </button>
            <button
              type="button"
              className="demo-btn"
              onClick={() => {
                setPass(0);
                setRunning(true);
              }}
            >
              Run the pass again
            </button>
          </div>
        </div>
      </div>
      <p className="demo-caption">
        A sample console, read by the same <code>src/core/redact.ts</code> the extension ships.
        Nothing here is a real customer.
      </p>
    </div>
  );
}

function App() {
  useReveal();
  const glowRef = usePointerGlow<HTMLElement>();
  const howRef = useScrollProgress<HTMLElement>();
  const booted = useBoot();
  const [progress, setProgress] = useState(0);
  const railRef = useRef<HTMLSpanElement | null>(null);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const max = document.documentElement.scrollHeight - innerHeight;
      setProgress(max > 0 ? Math.min(1, scrollY / max) : 0);
    };
    const onScroll = () => {
      if (frame) return;
      frame = requestAnimationFrame(update);
    };
    update();
    addEventListener('scroll', onScroll, { passive: true });
    return () => {
      removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    railRef.current?.style.setProperty('--load', String(progress));
  }, [progress]);

  return (
    <div className={`shell${booted ? ' is-booted' : ''}`}>
      <div className="boot" aria-hidden="true">
        <span className="boot-mark" />
        <span className="boot-word">redact</span>
      </div>

      <a className="skip" href="#main">
        Skip to content
      </a>

      <span className="rail" aria-hidden="true">
        <span ref={railRef} className="rail-fill" />
      </span>

      <header className="top">
        <a className="brand" href="#top" aria-label="Redact, back to top">
          <span className="brand-mark" aria-hidden="true" />
          <span className="brand-word">redact</span>
        </a>
        <nav className="nav" aria-label="Sections">
          <a href="#coverage">Coverage</a>
          <a href="#how">The pass</a>
          <a href="#install">Install</a>
          <a href={REPO} target="_blank" rel="noreferrer">
            Source
          </a>
        </nav>
        <span className="top-meta">MV3 / v0.1</span>
      </header>

      <main id="main">
        <section className="hero" id="top" ref={glowRef}>
          <div className="hero-inner">
            <p className="kicker">
              <span className="kicker-dot" aria-hidden="true" />
              Chrome extension · 5 pattern families · 0 network requests
            </p>
            <h1 className="hero-title">
              <span className="line">
                <span className="line-inner">Share the screen.</span>
              </span>
              <span className="line">
                <span className="line-inner">
                  Not the <em>card number</em>.
                </span>
              </span>
            </h1>
            <p className="hero-sub">
              Redact walks the page you are sharing and blacks out the things you would rather
              not read aloud: card numbers, live API keys, session tokens, bank accounts and
              customer email addresses. One shortcut, before the screen share starts.
            </p>
            <div className="hero-actions">
              <a className="btn btn-primary" href={ZIP} download>
                <span>Install for Chrome</span>
                <span className="btn-arrow" aria-hidden="true">
                  ↓
                </span>
              </a>
              <a className="btn btn-ghost" href="#how">
                Read the pass
              </a>
            </div>
            <p className="hero-note">
              <kbd>Alt</kbd> <span aria-hidden="true">+</span> <kbd>Shift</kbd>{' '}
              <span aria-hidden="true">+</span> <kbd>R</kbd> toggles it. It cannot see a password
              field, and it never sends a byte anywhere.
            </p>
          </div>

          <div className="hero-demo">
            <DemoPanel />
          </div>
        </section>

        <section className="section coverage" id="coverage" aria-labelledby="coverage-title">
          <div className="col-head">
            <p className="index">01 / Coverage</p>
            <h2 id="coverage-title">
              Six ways a
              <br />
              screen share
              <br />
              goes wrong.
            </h2>
            <p className="col-note">
              Every one of these is checked before it is hidden. A card number has to pass Luhn.
              An IBAN has to pass MOD-97. Order ids and version strings stay exactly where they
              are.
            </p>
          </div>

          <ul className="cov-list">
            {COVERAGE.map((category, index) => (
              <li className="cov-row" key={category.id} data-reveal>
                <span className="cov-num">{String(index + 1).padStart(2, '0')}</span>
                <span className="cov-label">{category.label}</span>
                <span className="cov-blurb">{category.blurb}</span>
                <span className="cov-chip" aria-hidden="true">
                  <span className="cov-raw">{category.sample}</span>
                  <span className="cov-tape">{category.masked}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <div className="band" aria-hidden="true">
          <div className="band-track">
            {[0, 1].map((copy) => (
              <span className="band-run" key={copy}>
                <span>Card numbers</span>
                <i>✳</i>
                <span>Live keys</span>
                <i>✳</i>
                <span>Session tokens</span>
                <i>✳</i>
                <span>Bank accounts</span>
                <i>✳</i>
                <span>Customer emails</span>
                <i>✳</i>
              </span>
            ))}
          </div>
        </div>

        <section className="section how" id="how" ref={howRef} aria-labelledby="how-title">
          <div className="how-head">
            <p className="index">02 / The pass</p>
            <h2 id="how-title">Three moves, then it watches.</h2>
          </div>

          <ol className="steps">
            <li className="step" data-reveal>
              <span className="step-num">1</span>
              <h3>Press.</h3>
              <p>
                Alt and Shift and R, or the mark in the toolbar. The setting lives in
                chrome.storage.sync, so every tab listens for the change and repaints without a
                reload.
              </p>
              <div className="step-art keys" aria-hidden="true">
                <kbd>Alt</kbd>
                <kbd>Shift</kbd>
                <kbd>R</kbd>
              </div>
            </li>

            <li className="step" data-reveal>
              <span className="step-num">2</span>
              <h3>Read, then refuse.</h3>
              <p>
                A TreeWalker collects the text nodes of the page. Each rule proposes a match; the
                checksum decides. Sixteen digits that fail Luhn are an order id, not a card, and
                they stay readable.
              </p>
              <div className="step-art verdicts" aria-hidden="true">
                <p>
                  <span>4242 4242 4242 4242</span>
                  <b className="ok">luhn ✓ → hide</b>
                </p>
                <p>
                  <span>1234 5678 9012 3456</span>
                  <b className="no">luhn ✕ → keep</b>
                </p>
              </div>
            </li>

            <li className="step" data-reveal>
              <span className="step-num">3</span>
              <h3>Keep up.</h3>
              <p>
                Apps render after the first paint. A MutationObserver catches added nodes and
                rescans them 220 ms later, so a modal that opens mid-call is covered before anyone
                reads it out.
              </p>
              <div className="step-art log" aria-hidden="true">
                <p><span>00:00.000</span> pass · 214 nodes</p>
                <p><span>00:00.612</span> modal opens · 38 nodes</p>
                <p><span>00:00.832</span> rescan · 3 hidden</p>
              </div>
            </li>
          </ol>

          <div className="how-burn" aria-hidden="true" />
        </section>

        <section className="section receipt-sec" aria-labelledby="receipt-title">
          <div className="receipt-copy">
            <p className="index">03 / The receipt</p>
            <h2 id="receipt-title">
              The only data
              <br />
              it wants is
              <br />
              <em>your settings</em>.
            </h2>
            <p>
              No account, no analytics, no remote config. The extension has one permission and it
              is the boring one: storage. You can read every line of it, and the install is a
              folder you unzipped yourself.
            </p>
          </div>

          <div className="receipt" data-reveal>
            <div className="receipt-tear" aria-hidden="true" />
            <p className="receipt-head">
              <span>Redact</span>
              <span>v0.1.0</span>
            </p>
            <p className="receipt-sub">Permission and network audit</p>
            <dl className="receipt-lines">
              <div><dt>network requests</dt><dd>0</dd></div>
              <div><dt>telemetry</dt><dd>none</dd></div>
              <div><dt>remote code</dt><dd>none</dd></div>
              <div><dt>permissions</dt><dd>storage</dd></div>
              <div><dt>reads</dt><dd>text nodes</dd></div>
              <div><dt>writes</dt><dd>black bars</dd></div>
              <div><dt>leaves the tab</dt><dd>never</dd></div>
              <div className="receipt-total"><dt>licence</dt><dd>MIT</dd></div>
            </dl>
            <div className="receipt-tear bottom" aria-hidden="true" />
          </div>
        </section>

        <section className="section limits" aria-labelledby="limits-title">
          <div className="limits-head">
            <p className="index">04 / Limits</p>
            <h2 id="limits-title">What it cannot do.</h2>
            <p className="col-note">
              A redaction tool that overstates itself is worse than none. These are the edges, in
              the same words the README uses.
            </p>
          </div>
          <ul className="limit-grid">
            <li data-reveal>
              <h3>Pixels are not text</h3>
              <p>An image of a card, a canvas, a PDF viewer: nothing to read, nothing to hide.</p>
            </li>
            <li data-reveal>
              <h3>Password fields are already safe</h3>
              <p>Inputs keep their value out of the DOM, and the browser masks them for you.</p>
            </li>
            <li data-reveal>
              <h3>Frames it cannot reach</h3>
              <p>Cross-origin iframes and closed shadow roots are out of scope in v0.1.</p>
            </li>
            <li data-reveal>
              <h3>Only what it knows</h3>
              <p>A loyalty number, a postal address, a diagnosis: no pattern, no bar.</p>
            </li>
          </ul>
        </section>

        <section className="section install" id="install" aria-labelledby="install-title">
          <div className="install-inner">
            <p className="index">05 / Install</p>
            <h2 id="install-title">
              Two minutes,
              <br />
              no store,
              <br />
              no account.
            </h2>
            <p className="install-lede">
              It is an unsigned build, so Chrome will not show a store badge for it. You load the
              folder yourself, which also means you can read it first.
            </p>
            <div className="install-actions">
              <a className="btn btn-primary" href={ZIP} download>
                <span>Download redact-0.1.0.zip</span>
                <span className="btn-arrow" aria-hidden="true">↓</span>
              </a>
              <a className="btn btn-ghost" href={REPO} target="_blank" rel="noreferrer">
                Read the source
              </a>
            </div>
          </div>

          <ol className="install-steps">
            <li data-reveal>
              <span>01</span>
              <p>Unzip it somewhere you will remember.</p>
            </li>
            <li data-reveal>
              <span>02</span>
              <p>
                Open <code>chrome://extensions</code> and switch on Developer mode.
              </p>
            </li>
            <li data-reveal>
              <span>03</span>
              <p>
                Choose <em>Load unpacked</em>
                {' and pick the folder. Pin the mark, then press Alt, Shift and R over '}
                something you would not want on a call.
              </p>
            </li>
          </ol>
        </section>
      </main>

      <footer className="foot">
        <div className="foot-mark" aria-hidden="true">
          <span className="foot-word">redact</span>
          <span className="foot-bar" />
        </div>
        <div className="foot-meta">
          <p>
            Built for the moment before you hit <em>Share screen</em>. MIT, no tracking, one
            shortcut.
          </p>
          <nav aria-label="Footer">
            <a href={REPO} target="_blank" rel="noreferrer">GitHub</a>
            <a href={ZIP} download>Download</a>
            <a href="#top">Back to top</a>
          </nav>
          <p className="foot-fine">© 2026 Ishita Singh</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
