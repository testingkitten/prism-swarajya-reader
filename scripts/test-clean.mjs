import fs from 'fs'
import { pathToFileURL } from 'url'

const articleSrc = fs.readFileSync('./api/article.js', 'utf8')
const testSrc =
  articleSrc
    .replace('export default async function handler', 'export async function handler')
    .replace(
      'function cleanMarkdown(raw, title) {',
      'export function cleanMarkdown(raw, title) {',
    )
    .replace(
      'function looksPaywalled(raw, markdown) {',
      'export function looksPaywalled(raw, markdown) {',
    ) + '\n'

fs.writeFileSync('./tmp-article-test.mjs', testSrc)
const mod = await import(`${pathToFileURL('./tmp-article-test.mjs').href}?t=${Date.now()}`)

const news = fs.readFileSync('./tmp-jina-news.md', 'utf8')
const books = fs.readFileSync('./tmp-jina-books.md', 'utf8')
const newsTitle = news.match(/^Title:\s*(.+)$/m)[1].trim()
const booksTitle = books.match(/^Title:\s*(.+)$/m)[1].trim()

const cleanedNews = mod.cleanMarkdown(news, newsTitle)
const cleanedBooks = mod.cleanMarkdown(books, booksTitle)

const banned = [
  'Close Sidebar',
  'Save & read from anywhere',
  'Sign In',
  "Don't Stop Midway",
  'Become a Patron',
  'Get Swarajya',
  'Join our WhatsApp',
  'We light sparks',
  'Please click here to add',
  'Also Read:',
  '![',
  'Swarajya Logo',
  'Tags*',
  'Please Sign In To Continue Reading',
  'Comments ↓',
]

let failures = 0
console.log('--- NEWS cleaned length', cleanedNews.length)
console.log(cleanedNews.slice(0, 500))
console.log('...')
console.log(cleanedNews.slice(-350))
for (const b of banned) {
  if (cleanedNews.includes(b)) {
    console.log('NEWS FAIL contains:', b)
    failures += 1
  }
}
if (!cleanedNews.includes('IRFC')) {
  console.log('NEWS FAIL missing body')
  failures += 1
}
// Caption should be gone
if (cleanedNews.includes('Ameerpet')) {
  console.log('NEWS WARN still has image caption:', cleanedNews.split('\n')[0])
}

console.log('\n--- BOOKS cleaned length', cleanedBooks.length)
console.log(cleanedBooks.slice(0, 500))
console.log('...')
console.log(cleanedBooks.slice(-350))
for (const b of banned) {
  if (cleanedBooks.includes(b)) {
    console.log('BOOKS FAIL contains:', b)
    failures += 1
  }
}
console.log('books partial?', mod.looksPaywalled(books, cleanedBooks))
if (!mod.looksPaywalled(books, cleanedBooks)) {
  console.log('BOOKS FAIL expected partial')
  failures += 1
}

fs.unlinkSync('./tmp-article-test.mjs')
console.log(failures === 0 ? '\nALL CLEANUP CHECKS PASSED' : `\n${failures} FAILURES`)
process.exit(failures === 0 ? 0 : 1)
