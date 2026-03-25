export function expandPrintItems(items, fallbackCopies = 1) {
  const source = Array.isArray(items) ? items : []
  const expanded = []

  source.forEach((item, index) => {
    const copies = Math.max(1, Number(item?.copies || fallbackCopies || 1))
    for (let copyIndex = 0; copyIndex < copies; copyIndex += 1) {
      expanded.push({
        ...item,
        __printKey: `${item?.sku || item?.barcodeValue || item?.qrValue || "item"}-${index}-${copyIndex}`,
      })
    }
  })

  return expanded
}

export function buildA4PrintLayout(items, options = {}) {
  const columns = Math.max(1, Number(options.columns || 1))
  const rows = Math.max(1, Number(options.rows || 1))
  const labelsPerPage = columns * rows
  const expanded = expandPrintItems(items, options.fallbackCopies)
  const pages = []

  for (let index = 0; index < expanded.length; index += labelsPerPage) {
    pages.push(expanded.slice(index, index + labelsPerPage))
  }

  return {
    columns,
    rows,
    labelsPerPage,
    totalItems: expanded.length,
    totalPages: Math.max(1, pages.length),
    pages: pages.length ? pages : [[]],
  }
}

export function buildRollPrintLayout(items, options = {}) {
  const gap = Math.max(0, Number(options.gap || 0))
  const labelHeight = Math.max(1, Number(options.labelHeight || 1))
  const expanded = expandPrintItems(items, options.fallbackCopies)

  return {
    totalItems: expanded.length,
    estimatedLength: expanded.length * (labelHeight + gap),
    items: expanded,
  }
}
