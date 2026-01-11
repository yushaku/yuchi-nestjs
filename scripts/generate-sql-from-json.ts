import * as fs from 'fs'
import * as path from 'path'
import { randomUUID } from 'crypto'

interface QuizQuestion {
  question: string
  question_translation: string
  options: string[]
  correct_answer: string
  explanation: string
}

interface Word {
  korean: string
  hanja: string | null
  vietnamese: string
  pronunciation: string
  example: string | null
  example_translation: string | null
  quiz: QuizQuestion[]
}

interface Category {
  name: string
  description: string
  icon: string
  order: number
  words: Word[]
}

interface LearningData {
  topik_level: number
  name: string
  description: string
  group_name: string
  group_icon: string
  group_order?: number
  categories: Category[]
}

function escapeSqlString(str: string | null | undefined): string {
  if (str === null || str === undefined) {
    return 'NULL'
  }
  // Escape single quotes by doubling them
  return `'${str.replace(/'/g, "''")}'`
}

function formatPostgresArray(arr: string[]): string {
  // Use ARRAY constructor syntax: ARRAY['value1', 'value2']::text[]
  // This is more reliable for handling special characters including single quotes
  const escaped = arr.map((item) => {
    // Escape single quotes by doubling them (SQL standard)
    const escapedItem = item.replace(/'/g, "''")
    return escapeSqlString(escapedItem)
  })
  return `ARRAY[${escaped.join(', ')}]::text[]`
}

/**
 * Extract group order from filename
 * Examples:
 * - "topik1_group1" -> 1
 * - "topik2_group5" -> 5
 * - "topik3_group10" -> 10
 * Returns null if pattern not found
 */
function extractGroupOrderFromFilename(fileName: string): number | null {
  const match = fileName.match(/group(\d+)$/i)
  if (match && match[1]) {
    return parseInt(match[1], 10)
  }
  return null
}

function generateSQL(
  data: LearningData,
  groupOrderFromFilename?: number,
): string {
  const now = new Date().toISOString()
  const sqlStatements: string[] = []

  sqlStatements.push(`BEGIN;`)
  sqlStatements.push('')

  // Generate UUIDs upfront for LearningGroup, Categories, and Vocabulary (they all use UUID)
  const groupId = randomUUID()
  const categoryIds = data.categories.map(() => randomUUID())

  // Create a mapping of category name to UUID for easy lookup
  const categoryIdMap = new Map<string, string>()
  data.categories.forEach((category, index) => {
    categoryIdMap.set(category.name, categoryIds[index])
  })

  // Generate UUIDs for all Vocabulary words and create mapping
  const vocabularyIdMap = new Map<string, string>() // Maps (categoryName, korean) -> vocabId
  const vocabularyIds: string[] = []
  data.categories.forEach((category) => {
    category.words.forEach((word) => {
      const vocabId = randomUUID()
      vocabularyIds.push(vocabId)
      vocabularyIdMap.set(`${category.name}::${word.korean}`, vocabId)
    })
  })

  // 1. Insert LearningGroup (UUID)
  sqlStatements.push(`-- LearningGroup: ${data.group_name}`)
  // Priority: filename > JSON data > default 0
  const groupOrder = groupOrderFromFilename ?? data.group_order ?? 0
  sqlStatements.push(
    `INSERT INTO "LearningGroup" (id, name, icon, "order", "topikLevel", "createdAt", "updatedAt") VALUES (` +
      `${escapeSqlString(groupId)}, ` +
      `${escapeSqlString(data.group_name)}, ` +
      `${escapeSqlString(data.group_icon)}, ` +
      `${groupOrder}, ` +
      `${data.topik_level}, ` +
      `${escapeSqlString(now)}, ` +
      `${escapeSqlString(now)}` +
      `);`,
  )
  sqlStatements.push('')

  // 2. Insert Categories (UUID) - Multi-row INSERT
  sqlStatements.push(`-- Categories (${data.categories.length} categories)`)
  const categoryValues = data.categories.map(
    (category, index) =>
      `(${escapeSqlString(categoryIds[index])}, ` +
      `${escapeSqlString(category.name)}, ` +
      `${escapeSqlString(category.description)}, ` +
      `${escapeSqlString(category.icon)}, ` +
      `${category.order}, ` +
      `${data.topik_level}, ` +
      `${escapeSqlString(groupId)}, ` +
      `${escapeSqlString(now)}, ` +
      `${escapeSqlString(now)})`,
  )
  sqlStatements.push(
    `INSERT INTO "Category" (id, name, description, icon, "order", "topikLevel", "groupId", "createdAt", "updatedAt") VALUES ` +
      categoryValues.join(',\n  ') +
      `;`,
  )
  sqlStatements.push('')

  // 3. Insert Vocabulary Words (UUID) - Multi-row INSERT
  sqlStatements.push(`-- Vocabulary Words`)
  const vocabularyValues: string[] = []
  let vocabIndex = 0
  data.categories.forEach((category) => {
    category.words.forEach((word) => {
      const categoryId = categoryIdMap.get(category.name)!
      const vocabId = vocabularyIds[vocabIndex++]
      vocabularyValues.push(
        `(${escapeSqlString(vocabId)}, ` +
          `${escapeSqlString(word.korean)}, ` +
          `${escapeSqlString(word.hanja)}, ` +
          `${escapeSqlString(word.vietnamese)}, ` +
          `${escapeSqlString(word.pronunciation)}, ` +
          `${escapeSqlString(word.example)}, ` +
          `${escapeSqlString(word.example_translation)}, ` +
          `${escapeSqlString(categoryId)}, ` +
          `${escapeSqlString(now)}, ` +
          `${escapeSqlString(now)})`,
      )
    })
  })
  sqlStatements.push(
    `INSERT INTO "Vocabulary" (id, korean, hanja, vietnamese, pronunciation, example, "exampleTranslation", "categoryId", "createdAt", "updatedAt") VALUES ` +
      vocabularyValues.join(',\n  ') +
      `;`,
  )
  sqlStatements.push('')

  // 4. Insert Quiz Questions (UUID) - Multi-row INSERT
  // Use pre-generated vocabulary UUIDs directly (no CTE/JOIN needed)
  sqlStatements.push(`-- Quiz Questions`)
  const quizValues: string[] = []
  vocabIndex = 0
  data.categories.forEach((category) => {
    category.words.forEach((word) => {
      const vocabId = vocabularyIds[vocabIndex++]
      word.quiz.forEach((quiz) => {
        const quizId = randomUUID()
        quizValues.push(
          `(${escapeSqlString(quizId)}, ` +
            `${escapeSqlString(quiz.question)}, ` +
            `${escapeSqlString(quiz.question_translation)}, ` +
            `${formatPostgresArray(quiz.options)}, ` +
            `${escapeSqlString(quiz.correct_answer)}, ` +
            `${escapeSqlString(quiz.explanation)}, ` +
            `${escapeSqlString(vocabId)}, ` +
            `${escapeSqlString(now)}, ` +
            `${escapeSqlString(now)})`,
        )
      })
    })
  })
  sqlStatements.push(
    `INSERT INTO "QuizQuestion" (id, question, "questionTranslation", options, "correctAnswer", explanation, "VocabularyId", "createdAt", "updatedAt") VALUES ` +
      quizValues.join(',\n  ') +
      `;`,
  )

  sqlStatements.push('')
  sqlStatements.push(`COMMIT;`)

  return sqlStatements.join('\n')
}

// Find all JSON files in the learning directory
function findJsonFiles(dir: string): string[] {
  const files: string[] = []
  const entries = fs.readdirSync(dir, { withFileTypes: true })

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      // Recursively search subdirectories
      files.push(...findJsonFiles(fullPath))
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      files.push(fullPath)
    }
  }

  return files
}

// Main execution
const learningDataDir = path.join(__dirname, '../../app/assets/data/learning')

console.log(`Scanning for JSON files in: ${learningDataDir}`)

try {
  const jsonFiles = findJsonFiles(learningDataDir)
  console.log(`Found ${jsonFiles.length} JSON files\n`)

  if (jsonFiles.length === 0) {
    console.error('No JSON files found!')
    process.exit(1)
  }

  let totalGroups = 0
  let totalCategories = 0
  let totalWords = 0
  let totalQuizzes = 0
  const allSqlStatements: string[] = []

  // Process each JSON file
  for (const jsonFilePath of jsonFiles) {
    const fileName = path.basename(jsonFilePath, '.json')
    console.log(`Processing: ${fileName}`)

    try {
      const jsonData = fs.readFileSync(jsonFilePath, 'utf-8')
      const data: LearningData = JSON.parse(jsonData)

      // Extract group order from filename (e.g., "topik1_group1" -> 1)
      const groupOrderFromFilename = extractGroupOrderFromFilename(fileName)
      if (groupOrderFromFilename !== null) {
        console.log(
          `  → Extracted groupOrder from filename: ${groupOrderFromFilename}`,
        )
      }

      const sql = generateSQL(data, groupOrderFromFilename ?? undefined)

      // Save individual SQL file
      const outputPath = path.join(__dirname, `./generated-${fileName}.sql`)
      fs.writeFileSync(outputPath, sql, 'utf-8')
      console.log(`  ✓ SQL saved to: ${outputPath}`)

      // Add to combined SQL (remove BEGIN/COMMIT from individual SQL)
      const sqlWithoutTransaction = sql
        .replace(/^BEGIN;\s*\n\n/, '')
        .replace(/\n\nCOMMIT;\s*$/, '')
      allSqlStatements.push(`-- ============================================`)
      allSqlStatements.push(`-- ${fileName}`)
      allSqlStatements.push(`-- ============================================`)
      allSqlStatements.push(sqlWithoutTransaction)
      allSqlStatements.push('')

      // Update totals
      totalGroups++
      totalCategories += data.categories.length
      const words = data.categories.reduce(
        (sum, cat) => sum + cat.words.length,
        0,
      )
      totalWords += words
      const quizzes = data.categories.reduce(
        (sum, cat) => sum + cat.words.reduce((s, w) => s + w.quiz.length, 0),
        0,
      )
      totalQuizzes += quizzes

      console.log(
        `  ✓ Categories: ${data.categories.length}, Words: ${words}, Quizzes: ${quizzes}`,
      )
    } catch (error) {
      console.error(`  ✗ Error processing ${fileName}:`, error)
      // Continue with other files
    }
  }

  // Save combined SQL file (single transaction for all)
  const combinedSqlStatements: string[] = []
  combinedSqlStatements.push(`BEGIN;`)
  combinedSqlStatements.push('')
  combinedSqlStatements.push(...allSqlStatements)
  combinedSqlStatements.push(`COMMIT;`)
  const combinedSql = combinedSqlStatements.join('\n')
  const combinedOutputPath = path.join(
    __dirname,
    './generated-all-learning-data.sql',
  )
  fs.writeFileSync(combinedOutputPath, combinedSql, 'utf-8')
  console.log(`\n✓ Combined SQL saved to: ${combinedOutputPath}`)

  // Final summary
  console.log('\n=== FINAL SUMMARY ===')
  console.log(`Total Groups: ${totalGroups}`)
  console.log(`Total Categories: ${totalCategories}`)
  console.log(`Total Vocabulary Words: ${totalWords}`)
  console.log(`Total Quiz Questions: ${totalQuizzes}`)
} catch (error) {
  console.error('Error:', error)
  process.exit(1)
}
