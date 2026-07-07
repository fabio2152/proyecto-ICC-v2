import { Fragment } from 'react'

// Renderiza el subconjunto de markdown que le pedimos a la IA que use:
// párrafos, **negrita** y viñetas con '-'/'*'. Sin dangerouslySetInnerHTML.
function renderInline(text: string, keyPrefix: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g).filter(Boolean)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={`${keyPrefix}-${i}`}>{part.slice(2, -2)}</strong>
    }
    return <Fragment key={`${keyPrefix}-${i}`}>{part}</Fragment>
  })
}

function isBullet(line: string): boolean {
  return /^\s*[-*]\s+/.test(line)
}

type Block = { type: 'p'; lines: string[] } | { type: 'ul'; items: string[] }

// Recorre línea por línea (no solo por bloques separados por línea en blanco):
// esto agrupa viñetas consecutivas en una lista aunque vengan pegadas a una
// frase introductoria sin salto de línea doble, algo muy común en el texto
// que devuelve Haiku.
function toBlocks(text: string): Block[] {
  const blocks: Block[] = []
  let paragraph: string[] = []
  let list: string[] = []

  const flushParagraph = () => {
    if (paragraph.length) {
      blocks.push({ type: 'p', lines: paragraph })
      paragraph = []
    }
  }
  const flushList = () => {
    if (list.length) {
      blocks.push({ type: 'ul', items: list })
      list = []
    }
  }

  for (const rawLine of text.trim().split('\n')) {
    const line = rawLine.trimEnd()
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    if (isBullet(line)) {
      flushParagraph()
      list.push(line.replace(/^\s*[-*]\s+/, ''))
    } else {
      flushList()
      paragraph.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}

export function renderSimpleMarkdown(text: string) {
  const blocks = toBlocks(text)

  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === 'ul') {
          return (
            <ul key={idx} className="list-disc list-inside space-y-1 my-1">
              {block.items.map((item, i) => (
                <li key={i}>{renderInline(item, `${idx}-${i}`)}</li>
              ))}
            </ul>
          )
        }
        return (
          <p key={idx} className={idx > 0 ? 'mt-2' : undefined}>
            {block.lines.map((line, i) => (
              <Fragment key={i}>
                {i > 0 && <br />}
                {renderInline(line, `${idx}-${i}`)}
              </Fragment>
            ))}
          </p>
        )
      })}
    </>
  )
}
