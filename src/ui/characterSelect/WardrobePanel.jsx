import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ACCESSORY_ITEMS,
  HAIR_PALETTE,
  HAIR_STYLES,
  isPresetAppearance,
  normalizeAppearance,
  OUTFIT_STYLES,
  PANTS_KINDS,
  PANTS_PALETTE,
  presetAppearance,
  randomAppearance,
  SHOE_PALETTE,
  SKIN_PALETTE,
  TOP_PALETTE,
} from '../../characters/appearance.js'

const TABS = ['hair', 'outfit', 'bottom', 'acc']

function Swatches({ colors, value, onPick, label }) {
  return (
    <div className="wardrobe__swatches" role="radiogroup" aria-label={label}>
      {colors.map((hex) => {
        const active = value.toLowerCase() === hex.toLowerCase()
        return (
          <button
            key={hex}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={`#${hex}`}
            className={active ? 'wardrobe__swatch wardrobe__swatch--active' : 'wardrobe__swatch'}
            style={{ '--swatch': `#${hex}` }}
            onClick={() => onPick(hex)}
          />
        )
      })}
    </div>
  )
}

/**
 * Tủ đồ phối trang phục 3D trực tiếp: kiểu tóc, kiểu áo, quần dài/ngắn, giày, màu da và phụ kiện.
 */
export default function WardrobePanel({ appearance, onChange, disabled = false }) {
  const { t } = useTranslation()
  const [tab, setTab] = useState('hair')

  const update = (patch) => {
    if (disabled) return
    onChange(normalizeAppearance({ ...appearance, ...patch }, appearance.base))
  }

  const toggleAccessory = (item) => {
    if (disabled) return
    const current = new Set(appearance.acc)
    if (current.has(item)) {
      current.delete(item)
    } else {
      // Đổi giữa 2 loại mũ thay vì đội chồng lên nhau
      if (item === 'cap') current.delete('beret')
      if (item === 'beret') current.delete('cap')
      current.add(item)
    }
    update({ acc: [...current] })
  }

  const unmodified = isPresetAppearance(appearance)

  return (
    <aside className="wardrobe" aria-label={t('select.wardrobe.title')}>
      <div className="wardrobe__header">
        <strong>{t('select.wardrobe.title')}</strong>
        <div className="wardrobe__quick">
          <button
            type="button"
            className="wardrobe__mini"
            disabled={disabled}
            onClick={() => onChange(randomAppearance(appearance.base))}
          >
            {t('select.wardrobe.shuffle')}
          </button>
          <button
            type="button"
            className="wardrobe__mini"
            disabled={disabled || unmodified}
            onClick={() => onChange(presetAppearance(appearance.base))}
          >
            {t('select.wardrobe.reset')}
          </button>
        </div>
      </div>

      <div className="wardrobe__tabs" role="tablist">
        {TABS.map((key) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            className={tab === key ? 'wardrobe__tab wardrobe__tab--active' : 'wardrobe__tab'}
            onClick={() => setTab(key)}
          >
            {t(`select.wardrobe.tabs.${key}`)}
          </button>
        ))}
      </div>

      {tab === 'hair' && (
        <div className="wardrobe__section">
          <div className="wardrobe__chips">
            {HAIR_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                disabled={disabled}
                aria-pressed={appearance.hair === style}
                className={appearance.hair === style ? 'wardrobe__chip wardrobe__chip--active' : 'wardrobe__chip'}
                onClick={() => update({ hair: style })}
              >
                {t(`select.wardrobe.hairs.${style}`)}
              </button>
            ))}
          </div>
          <span className="wardrobe__sublabel">{t('select.wardrobe.hairColor')}</span>
          <Swatches colors={HAIR_PALETTE} value={appearance.hc} onPick={(hc) => update({ hc })} label={t('select.wardrobe.hairColor')} />
        </div>
      )}

      {tab === 'outfit' && (
        <div className="wardrobe__section">
          <div className="wardrobe__chips">
            {OUTFIT_STYLES.map((style) => (
              <button
                key={style}
                type="button"
                disabled={disabled}
                aria-pressed={appearance.outfit === style}
                className={appearance.outfit === style ? 'wardrobe__chip wardrobe__chip--active' : 'wardrobe__chip'}
                onClick={() => update({ outfit: style })}
              >
                {t(`select.wardrobe.outfits.${style}`)}
              </button>
            ))}
          </div>
          <span className="wardrobe__sublabel">{t('select.wardrobe.topColor')}</span>
          <Swatches colors={TOP_PALETTE} value={appearance.top} onPick={(top) => update({ top })} label={t('select.wardrobe.topColor')} />
        </div>
      )}

      {tab === 'bottom' && (
        <div className="wardrobe__section">
          <div className="wardrobe__chips">
            {PANTS_KINDS.map((kind) => (
              <button
                key={kind}
                type="button"
                disabled={disabled}
                aria-pressed={appearance.pantsKind === kind}
                className={appearance.pantsKind === kind ? 'wardrobe__chip wardrobe__chip--active' : 'wardrobe__chip'}
                onClick={() => update({ pantsKind: kind })}
              >
                {t(`select.wardrobe.pantsKinds.${kind}`)}
              </button>
            ))}
          </div>
          <span className="wardrobe__sublabel">{t('select.wardrobe.pantsColor')}</span>
          <Swatches colors={PANTS_PALETTE} value={appearance.pants} onPick={(pants) => update({ pants })} label={t('select.wardrobe.pantsColor')} />
          <span className="wardrobe__sublabel">{t('select.wardrobe.shoeColor')}</span>
          <Swatches colors={SHOE_PALETTE} value={appearance.shoe} onPick={(shoe) => update({ shoe })} label={t('select.wardrobe.shoeColor')} />
        </div>
      )}

      {tab === 'acc' && (
        <div className="wardrobe__section">
          <div className="wardrobe__chips">
            {ACCESSORY_ITEMS.map((item) => {
              const on = appearance.acc.includes(item)
              return (
                <button
                  key={item}
                  type="button"
                  disabled={disabled}
                  aria-pressed={on}
                  className={on ? 'wardrobe__chip wardrobe__chip--active' : 'wardrobe__chip'}
                  onClick={() => toggleAccessory(item)}
                >
                  {t(`select.wardrobe.accessories.${item}`)}
                </button>
              )
            })}
          </div>
          <span className="wardrobe__sublabel">{t('select.wardrobe.skinTone')}</span>
          <Swatches colors={SKIN_PALETTE} value={appearance.skin} onPick={(skin) => update({ skin })} label={t('select.wardrobe.skinTone')} />
        </div>
      )}

      <p className="wardrobe__spin-hint">{t('select.wardrobe.spinHint')}</p>
    </aside>
  )
}
