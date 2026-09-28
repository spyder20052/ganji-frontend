import { SYMBOL_LEAVES } from '@/components/GanjiSymbol';
import { LOGOTYPE_PATH, LOGOTYPE_VIEWBOX } from '@/components/logotype-trace';

/** Une fois par session : le script marque la page avant son premier affichage, le rideau n'est plus joué. */
const ONCE = "try{if(sessionStorage.getItem('ganji-intro'))document.documentElement.classList.add('intro-vue');else sessionStorage.setItem('ganji-intro','1')}catch(e){}";

/**
 * Première entrée sur le site (≈ 2,8 s, une fois par session). Sur fond Papier, les quatre feuilles du
 * symbole arrivent des coins et s'assemblent ; le symbole bat, « Ganji » monte dessous avec une fine barre
 * de chargement ; puis un disque Forêt s'ouvre depuis le symbole et avale le fond clair (les feuilles passent
 * en Pousse, le nom en blanc), et le rideau se fond dans le hero. Du clair au sombre : on ne peut pas le
 * manquer. CSS seul ; retiré en « mouvement réduit ».
 */
export function Intro() {
  return (
    <>
      <script dangerouslySetInnerHTML={{ __html: ONCE }} />
      <div aria-hidden className="intro fixed inset-0 z-[60] isolate overflow-hidden bg-[#f5f4ee]">
        <div className="grid h-full place-items-center">
          <div className="intro-group flex flex-col items-center">
            <span className="relative grid place-items-center">
              {/* Disque Forêt centré sur le symbole : il grandit depuis lui et avale le fond clair. */}
              <span className="intro-iris absolute top-1/2 left-1/2 -z-10 h-[300vmax] w-[300vmax] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand-900" />
              <span className="intro-ring absolute h-32 w-32 rounded-full" />
              <svg viewBox="0 0 520 520" className="intro-mark h-24 w-24 overflow-visible sm:h-28 sm:w-28">
                {SYMBOL_LEAVES.map((d, i) => (
                  <path key={i} d={d} className={`intro-leaf intro-leaf-${i}`} />
                ))}
              </svg>
            </span>
            <span className="intro-word mt-5 block overflow-hidden">
              <svg viewBox={LOGOTYPE_VIEWBOX} className="intro-name block h-10 sm:h-12" style={{ aspectRatio: LOGOTYPE_VIEWBOX.split(' ').slice(2).join(' / ') }}>
                <path d={LOGOTYPE_PATH} />
              </svg>
            </span>
            <span className="intro-bar mt-5 block h-[3px] w-28 overflow-hidden rounded-full">
              <span className="block h-full w-full rounded-full" />
            </span>
          </div>
        </div>
      </div>
    </>
  );
}
