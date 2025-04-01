"use server"

import { cache } from "react"

interface TestResult {
  id: string
  timestamp: string
  score: string
  username: string
  percentage: number
}

// Get all unique emails from the spreadsheet
export const getAvailableEmails = cache(async () => {
  try {
    // Use the provided Sheet ID
    const SHEET_ID = "1x_9wKPOvYgD69Fw7oQ795nh9uPn3xFIUd0iJLHjfLDQ"
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=891959498`

    console.log("Fetching available emails from spreadsheet")

    const response = await fetch(URL, {
      cache: "no-store",
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    const jsonStartIndex = text.indexOf("{")
    const jsonEndIndex = text.lastIndexOf("}")

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Invalid response format from Google Sheets")
    }

    const jsonText = text.substring(jsonStartIndex, jsonEndIndex + 1)
    const data = JSON.parse(jsonText)

    if (!data.table || !data.table.rows) {
      throw new Error("No data found in the spreadsheet")
    }

    // Get unique emails from the username column
    const uniqueEmails = new Set<string>()

    data.table.rows.forEach((row: any) => {
      const rowData = row.c
      if (!rowData || rowData.length === 0) return

      const username = String(rowData[2]?.v || "").trim()
      if (username) {
        uniqueEmails.add(username)
      }
    })

    return {
      emails: Array.from(uniqueEmails),
      error: null,
    }
  } catch (error) {
    console.error("Error fetching available emails:", error)
    return {
      emails: [],
      error: "Имэйл жагсаалтыг ачааллахад алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
    }
  }
})

// Fetch test results filtered by user email
export const fetchUserTestResults = cache(async (userEmail: string) => {
  try {
    // Use the provided Sheet ID
    const SHEET_ID = "1x_9wKPOvYgD69Fw7oQ795nh9uPn3xFIUd0iJLHjfLDQ"
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=891959498`

    console.log(`Fetching test results for user email: ${userEmail}`)

    const response = await fetch(URL, {
      // Add cache: no-store to ensure we get fresh data
      cache: "no-store",
      // Add next.js revalidate option
      next: { revalidate: 60 }, // Revalidate every minute
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    // Google's response is not pure JSON, it has a prefix we need to remove
    // The format is typically: "/*O_o*/google.visualization.Query.setResponse({...});"
    const jsonStartIndex = text.indexOf("{")
    const jsonEndIndex = text.lastIndexOf("}")

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Invalid response format from Google Sheets")
    }

    const jsonText = text.substring(jsonStartIndex, jsonEndIndex + 1)
    const data = JSON.parse(jsonText)

    if (!data.table || !data.table.rows) {
      throw new Error("No data found in the spreadsheet")
    }

    // Process the data
    const parsedResults: TestResult[] = []

    // Normalize the user email for comparison
    const normalizedUserEmail = userEmail.toLowerCase().trim()
    console.log(`Looking for results matching email: ${normalizedUserEmail}`)

    // Log column headers for debugging
    if (data.table.cols && data.table.cols.length > 0) {
      console.log(
        "Column headers:",
        data.table.cols.map((col: any) => col.label || "Unnamed"),
      )
    }

    // Process each row
    data.table.rows.forEach((row: any, index: number) => {
      const rowData = row.c

      // Skip rows with no data
      if (!rowData || rowData.length === 0) return

      // Extract test data based on the spreadsheet structure
      const timestamp = rowData[0]?.v || ""
      const score = rowData[1]?.v || ""
      const username = String(rowData[2]?.v || "")
        .toLowerCase()
        .trim()
      const percentage = Number.parseFloat(rowData[3]?.v) || 0

      // Log for debugging
      console.log(`Row ${index} - Username/Email: "${username}", User email: "${normalizedUserEmail}"`)

      // More flexible matching for emails
      if (
        username === normalizedUserEmail ||
        username.includes(normalizedUserEmail) ||
        normalizedUserEmail.includes(username) ||
        // Check if the username part of the email matches
        username.includes(normalizedUserEmail.split("@")[0]) ||
        normalizedUserEmail.split("@")[0].includes(username)
      ) {
        console.log(`Match found for row ${index}`)
        parsedResults.push({
          id: `result-${index}`,
          timestamp: String(timestamp),
          score: score,
          username: username,
          percentage: percentage,
        })
      }
    })

    console.log(`Found ${parsedResults.length} results for user email ${normalizedUserEmail}`)

    return {
      results: parsedResults,
      error: null,
    }
  } catch (error) {
    console.error("Error fetching results:", error)
    return {
      results: [],
      error: "Шалгалтын дүнг ачааллахад алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
    }
  }
})

// Fetch results by specific email
export const fetchResultsByEmail = cache(async (searchEmail: string) => {
  try {
    // Use the provided Sheet ID
    const SHEET_ID = "1x_9wKPOvYgD69Fw7oQ795nh9uPn3xFIUd0iJLHjfLDQ"
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=891959498`

    console.log(`Fetching test results for search email: ${searchEmail}`)

    const response = await fetch(URL, {
      cache: "no-store",
      next: { revalidate: 60 },
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    const jsonStartIndex = text.indexOf("{")
    const jsonEndIndex = text.lastIndexOf("}")

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Invalid response format from Google Sheets")
    }

    const jsonText = text.substring(jsonStartIndex, jsonEndIndex + 1)
    const data = JSON.parse(jsonText)

    if (!data.table || !data.table.rows) {
      throw new Error("No data found in the spreadsheet")
    }

    // Process the data
    const parsedResults: TestResult[] = []

    // Normalize the search email for comparison
    const normalizedSearchEmail = searchEmail.toLowerCase().trim()

    // Process each row
    data.table.rows.forEach((row: any, index: number) => {
      const rowData = row.c

      // Skip rows with no data
      if (!rowData || rowData.length === 0) return

      // Extract test data based on the spreadsheet structure
      const timestamp = rowData[0]?.v || ""
      const score = rowData[1]?.v || ""
      const username = String(rowData[2]?.v || "")
        .toLowerCase()
        .trim()
      const percentage = Number.parseFloat(rowData[3]?.v) || 0

      // Check if this row matches the search email
      if (
        username === normalizedSearchEmail ||
        username.includes(normalizedSearchEmail) ||
        normalizedSearchEmail.includes(username)
      ) {
        parsedResults.push({
          id: `result-${index}`,
          timestamp: String(timestamp),
          score: score,
          username: username,
          percentage: percentage,
        })
      }
    })

    return {
      results: parsedResults,
      error: null,
    }
  } catch (error) {
    console.error("Error fetching results by email:", error)
    return {
      results: [],
      error: "Шалгалтын дүнг ачааллахад алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
    }
  }
})

// Fetch all test results
export const fetchAllTestResults = cache(async () => {
  try {
    // Use the provided Sheet ID
    const SHEET_ID = "1x_9wKPOvYgD69Fw7oQ795nh9uPn3xFIUd0iJLHjfLDQ"
    const URL = `https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=891959498`

    console.log("Fetching all test results")

    const response = await fetch(URL, {
      // Add cache: no-store to ensure we get fresh data
      cache: "no-store",
      // Add next.js revalidate option
      next: { revalidate: 60 }, // Revalidate every minute
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch data: ${response.status} ${response.statusText}`)
    }

    const text = await response.text()

    // Google's response is not pure JSON, it has a prefix we need to remove
    // The format is typically: "/*O_o*/google.visualization.Query.setResponse({...});"
    const jsonStartIndex = text.indexOf("{")
    const jsonEndIndex = text.lastIndexOf("}")

    if (jsonStartIndex === -1 || jsonEndIndex === -1) {
      throw new Error("Invalid response format from Google Sheets")
    }

    const jsonText = text.substring(jsonStartIndex, jsonEndIndex + 1)
    const data = JSON.parse(jsonText)

    if (!data.table || !data.table.rows) {
      throw new Error("No data found in the spreadsheet")
    }

    // Process the data
    const parsedResults: TestResult[] = []

    // Process each row
    data.table.rows.forEach((row: any, index: number) => {
      const rowData = row.c

      // Skip rows with no data
      if (!rowData || rowData.length === 0) return

      // Extract test data based on the spreadsheet structure
      const timestamp = rowData[0]?.v || ""
      const score = rowData[1]?.v || ""
      const username = rowData[2]?.v || ""
      const percentage = Number.parseFloat(rowData[3]?.v) || 0

      const result = {
        id: `result-${index}`,
        timestamp: String(timestamp),
        score: score,
        username: String(username),
        percentage: percentage,
      }

      parsedResults.push(result)
    })

    console.log(`Found ${parsedResults.length} total results`)

    return {
      results: parsedResults,
      error: null,
    }
  } catch (error) {
    console.error("Error fetching results:", error)
    return {
      results: [],
      error: "Шалгалтын дүнг ачааллахад алдаа гарлаа: " + (error instanceof Error ? error.message : String(error)),
    }
  }
})

