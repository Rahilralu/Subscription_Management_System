import { z } from 'zod'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../lib/http-error.js'
import { businessToday } from '../../lib/dates.js'
import { isDiscountUsable } from '../billing/invoice.calc.js'
import { quoteCart } from './cart.service.js'

// Everything here is read-only and shows customers only what the catalog already shows them:
// never cost prices, never other customers' data.

// Products have no category column, so the catalog marks add-ons by starting their notes with "Add-on".
export const isAddon = (product) => /^add-on/i.test(product.notes ?? '')

const toVariant = (v) => ({ id: v.id, label: `${v.attribute}: ${v.value}`, extraPrice: Number(v.extraPrice) })

const toProduct = (p) => ({
  id: p.id,
  name: p.name,
  type: p.type,
  price: Number(p.salesPrice),
  kind: isAddon(p) ? 'addon' : 'core',
  description: p.notes ?? '',
  variants: p.variants.map(toVariant),
})

// "Inventory, stock-keeping & POS" -> ['inventory', 'stock', 'keeping', 'pos']
export function toKeywords(input) {
  const words = (Array.isArray(input) ? input : [input])
    .flatMap((text) => String(text ?? '').toLowerCase().split(/[^a-z0-9]+/))
    .filter((word) => word.length >= 2 && !STOP_WORDS.has(word))
  return [...new Set(words)].slice(0, 12)
}

const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'need', 'needs', 'want', 'wants', 'have', 'has', 'our', 'are', 'you', 'can',
  'will', 'would', 'like', 'looking', 'please', 'help', 'get', 'use', 'using', 'that', 'this', 'from', 'but',
  'also', 'some', 'any', 'all', 'per', 'month', 'year', 'run', 'running', 'business', 'company', 'software',
  'who', 'what', 'how', 'about', 'into', 'out', 'new', 'more', 'than', 'its', 'their', 'there', 'them', 'they',
])

function score(product, words) {
  const name = product.name.toLowerCase()
  const text = `${product.notes ?? ''} ${product.variants.map((v) => `${v.attribute} ${v.value}`).join(' ')}`.toLowerCase()
  return words.reduce((total, word) => total + (name.includes(word) ? 3 : 0) + (text.includes(word) ? 1 : 0), 0)
}

export async function searchCatalog({ keywords } = {}) {
  const words = toKeywords(keywords)
  const include = { variants: true }

  const [candidates, addons, templates] = await Promise.all([
    words.length
      ? prisma.product.findMany({
          where: {
            active: true,
            OR: words.flatMap((word) => [
              { name: { contains: word, mode: 'insensitive' } },
              { notes: { contains: word, mode: 'insensitive' } },
              { variants: { some: { OR: [{ attribute: { contains: word, mode: 'insensitive' } }, { value: { contains: word, mode: 'insensitive' } }] } } },
            ]),
          },
          include,
        })
      : [],
    prisma.product.findMany({ where: { active: true, notes: { startsWith: 'Add-on', mode: 'insensitive' } }, include, orderBy: { name: 'asc' }, take: 12 }),
    words.length
      ? prisma.quotationTemplate.findMany({
          where: { OR: words.flatMap((word) => [{ name: { contains: word, mode: 'insensitive' } }, { notes: { contains: word, mode: 'insensitive' } }]) },
          include: { plan: { select: { name: true } }, lines: { include: { product: { select: { name: true } } } } },
          take: 3,
        })
      : [],
  ])

  const matches = candidates
    .map((product) => ({ product, score: score(product, words) }))
    .sort((a, b) => b.score - a.score || a.product.name.localeCompare(b.product.name))
    .slice(0, 8)
    .map(({ product }) => product)
  const matchedIds = new Set(matches.map((p) => p.id))

  return {
    matches: matches.map(toProduct),
    // always offered so the assistant can suggest add-ons even when no keyword mentions them
    addons: addons.filter((p) => !matchedIds.has(p.id)).map(toProduct),
    bundles: templates.map((t) => ({
      id: t.id,
      name: t.name,
      plan: t.plan.name,
      items: t.lines.map((line) => ({ productId: line.productId, name: line.product.name, quantity: line.quantity })),
    })),
  }
}

export async function listPlans() {
  const today = businessToday()
  const plans = await prisma.plan.findMany({ where: { active: true }, orderBy: { name: 'asc' } })
  return plans
    .filter((plan) => plan.startDate <= today && (!plan.endDate || plan.endDate >= today))
    .map((plan) => ({ id: plan.id, name: plan.name, billingPeriod: plan.billingPeriod, minQuantity: plan.minQuantity }))
}

export async function listDiscounts() {
  const today = businessToday()
  const discounts = await prisma.discount.findMany({ where: { active: true } })
  return discounts
    .filter((discount) => isDiscountUsable(discount, today))
    .map((d) => ({
      name: d.name,
      type: d.type,
      value: Number(d.value),
      appliesTo: d.scope === 'PRODUCT' ? `product ${d.productId}` : 'the whole subscription',
      minQuantity: d.minQuantity,
      minPurchase: d.minPurchase == null ? null : Number(d.minPurchase),
    }))
}

const proposeSchema = z.object({
  planId: z.coerce.number().int().positive(),
  items: z
    .array(
      z.object({
        productId: z.coerce.number().int().positive(),
        variantId: z.coerce.number().int().positive().nullish(),
        quantity: z.coerce.number().int().min(1).max(10000),
        kind: z.enum(['core', 'addon']).default('core'),
        reason: z.string().trim().max(200).default(''),
      }),
    )
    .min(1)
    .max(15),
})

// Checks a suggested cart against the live catalog and prices it. This is the only way the assistant
// can put a cart menu in front of the customer, and it can never set a price: amounts come from the database.
export async function proposeCart(args) {
  const parsed = proposeSchema.safeParse(args)
  if (!parsed.success) return { error: `Invalid cart: ${parsed.error.issues.map((i) => `${i.path.join('.')} ${i.message}`).join('; ')}` }
  const { planId, items } = parsed.data

  let quote
  try {
    quote = await quoteCart({ planId, lines: items.map(({ productId, variantId, quantity }) => ({ productId, variantId: variantId ?? null, quantity })) })
  } catch (err) {
    if (err instanceof HttpError) return { error: err.message }
    throw err
  }

  const [products, plans] = await Promise.all([
    prisma.product.findMany({ where: { id: { in: items.map((item) => item.productId) } }, include: { variants: true } }),
    listPlans(),
  ])
  const productById = new Map(products.map((p) => [p.id, p]))

  return {
    proposal: {
      planId,
      plans,
      items: items.map((item, i) => ({
        productId: item.productId,
        name: productById.get(item.productId).name,
        kind: item.kind,
        reason: item.reason,
        quantity: item.quantity,
        variantId: quote.lines[i].variantId,
        variants: productById.get(item.productId).variants.map(toVariant),
      })),
      quote,
    },
  }
}

// What the model is allowed to call, in OpenAI's tool format.
export const toolDefinitions = [
  {
    type: 'function',
    function: {
      name: 'search_catalog',
      description:
        'Search the Brightloop catalog of software products. Returns matching products with their variants and monthly price (before tax), '
        + 'ready-made bundles, and the available add-ons. Call it with several keywords and synonyms from the customer\'s needs.',
      parameters: {
        type: 'object',
        properties: {
          keywords: { type: 'array', items: { type: 'string' }, description: 'Words describing what the customer needs, e.g. ["inventory", "stock", "warehouse"]' },
        },
        required: ['keywords'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_plans',
      description: 'List the billing plans a customer can choose right now (billing frequency and minimum quantity per product).',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'list_discounts',
      description: 'List the discounts that are currently valid, so you can mention one that applies to the customer\'s quantity.',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function',
    function: {
      name: 'propose_cart',
      description:
        'Show the customer an interactive cart menu with your suggested products and add-ons. Call it once you know what to recommend. '
        + 'Use only ids returned by the other tools. The server prices the cart; never state prices yourself.',
      parameters: {
        type: 'object',
        properties: {
          planId: { type: 'integer', description: 'Id of a plan from list_plans' },
          items: {
            type: 'array',
            description: 'Suggested lines: the core products first, then up to 3 add-ons',
            items: {
              type: 'object',
              properties: {
                productId: { type: 'integer' },
                variantId: { type: ['integer', 'null'], description: 'A variant id of that same product, or null for the default' },
                quantity: { type: 'integer', description: 'Number of users or units, at least the plan minimum' },
                kind: { type: 'string', enum: ['core', 'addon'] },
                reason: { type: 'string', description: 'One short sentence on why this fits the customer' },
              },
              required: ['productId', 'quantity', 'kind', 'reason'],
            },
          },
        },
        required: ['planId', 'items'],
      },
    },
  },
]

// Runs one tool call. `forModel` is sent back to the model; `proposal` (if any) goes to the customer's screen.
export async function runTool(name, args) {
  switch (name) {
    case 'search_catalog':
      return { forModel: await searchCatalog(args) }
    case 'list_plans':
      return { forModel: { plans: await listPlans() } }
    case 'list_discounts':
      return { forModel: { discounts: await listDiscounts() } }
    case 'propose_cart': {
      const { proposal, error } = await proposeCart(args)
      if (error) return { forModel: { error } }
      return {
        proposal,
        // the customer sees the amounts in the menu, so the model only needs to know it worked
        forModel: { ok: true, note: 'The customer now sees an interactive cart menu with prices. Do not repeat prices or list every item; briefly explain your choices.' },
      }
    }
    default:
      return { forModel: { error: `Unknown tool: ${name}` } }
  }
}
