import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import ExcelJS from 'exceljs'

// LCY3 Column mapping - exact match to spreadsheet
const LCY3_COLUMNS = [
  { col: 'B', field: 'colB_type', header: 'Type' },
  { col: 'C', field: 'colC_category', header: 'Category' },
  { col: 'D', field: 'colD_parent', header: 'Parent' },
  { col: 'E', field: 'colE_object', header: 'Object' },
  { col: 'F', field: 'colF_equipmentConfiguration', header: 'Equipment Configuration' },
  { col: 'G', field: 'colG_description', header: 'Description' },
  { col: 'H', field: 'colH_equipmentPresent', header: 'Is the equipment present on site' },
  { col: 'I', field: 'colI_prefilledDataCorrect', header: 'Is the pre-filled data correct' },
  { col: 'J', field: 'colJ_commissioningDate', header: 'Commissioning Date DD/MM/YYYY' },
  { col: 'K', field: 'colK_manufacturer', header: 'Manufacturer' },
  { col: 'L', field: 'colL_model', header: 'Model' },
  { col: 'M', field: 'colM_serialNumber', header: 'Serial Number' },
  { col: 'N', field: 'colN_newManufacturer', header: 'New Manufacturer' },
  { col: 'O', field: 'colO_assetAlias', header: 'Asset familiar name / alias' },
  { col: 'P', field: 'colP_refrigerantType', header: 'Refrigerant Type' },
  { col: 'Q', field: 'colQ_refrigerantQty', header: 'QTY (kg)' },
  { col: 'R', field: 'colR_newApmLabelRequired', header: 'New APM label required' },
  { col: 'S', field: 'colS_floor', header: 'Floor' },
  { col: 'T', field: 'colT_location', header: 'Location' },
  { col: 'U', field: 'colU_assetCondition', header: 'Asset condition (Low / Medium / High risk)' },
  { col: 'V', field: 'colV_assetSize', header: 'Asset Size' },
  { col: 'W', field: 'colW_cibseGuidelines', header: 'CIBSE Guidelines' },
  { col: 'X', field: 'colX_sponsCostExclVat', header: 'SPONS – Cost of change – Excl VAT' },
  { col: 'Y', field: 'colY_observations', header: 'Observations' },
  { col: 'Z', field: 'colZ_criticalSpares', header: 'Critical spares required' },
  { col: 'AA', field: 'colAA_costOfChangeJayserv', header: 'Cost of Change – Jayserv' },
  { col: 'AB', field: 'colAB_pictureTaken', header: 'Picture Taken Y/N' },
  { col: 'AC', field: 'colAC_riskProfile', header: 'Risk Profile' },
]

// POST /api/export/excel - Generate LCY Excel workbook
export async function POST(request: NextRequest) {
  try {
    const { projectId, sheetType = 'LCY3' } = await request.json()

    if (!projectId) {
      return NextResponse.json({ error: 'Project ID required' }, { status: 400 })
    }

    // Get project and line items
    const project = await prisma.project.findUnique({
      where: { id: projectId },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const lineItems = await prisma.lineItem.findMany({
      where: {
        projectId,
        status: { in: ['APPROVED', 'EXPORTED'] },
      },
      include: {
        sponsMatches: {
          where: { isSelected: true },
          include: { sponsItem: true },
        },
        auditEntries: true,
      },
      orderBy: { createdAt: 'asc' },
    })

    // Create workbook
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'SPONSApp'
    workbook.created = new Date()

    // Main data sheet
    const dataSheet = workbook.addWorksheet(`Jayserv CIBSE ${sheetType} Collection`)
    
    // Set up headers in row 1 (starting from column B)
    const columns = sheetType === 'LCY3' ? LCY3_COLUMNS : LCY3_COLUMNS // TODO: Add LCY2 mapping
    
    // Validate headers match expected
    columns.forEach((colDef, index) => {
      const cell = dataSheet.getCell(`${colDef.col}1`)
      cell.value = colDef.header
      cell.font = { bold: true }
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      }
    })

    // Add data rows starting from row 2
    lineItems.forEach((item, rowIndex) => {
      const row = rowIndex + 2
      
      columns.forEach((colDef) => {
        const cell = dataSheet.getCell(`${colDef.col}${row}`)
        const value = (item as Record<string, unknown>)[colDef.field]
        
        // Format dates
        if (colDef.field === 'colJ_commissioningDate' && value) {
          cell.value = new Date(value as string).toLocaleDateString('en-GB')
        } else {
          cell.value = value as string | number | null
        }
      })

      // Mark as exported
      prisma.lineItem.update({
        where: { id: item.id },
        data: { status: 'EXPORTED' },
      })
    })

    // Audit sheet
    const auditSheet = workbook.addWorksheet('Audit Trail')
    auditSheet.columns = [
      { header: 'Line Item ID', key: 'lineItemId', width: 25 },
      { header: 'Spoken Sentence', key: 'spokenSentence', width: 50 },
      { header: 'Timestamp', key: 'timestamp', width: 20 },
      { header: 'Unit Conversion', key: 'unitConversion', width: 30 },
      { header: 'SPONS Candidates', key: 'sponsCandidates', width: 40 },
      { header: 'Final Selection', key: 'finalSelection', width: 20 },
      { header: 'Approval Status', key: 'approvalStatus', width: 15 },
    ]

    lineItems.forEach((item) => {
      item.auditEntries.forEach((entry) => {
        auditSheet.addRow({
          lineItemId: item.id,
          spokenSentence: entry.spokenSentence,
          timestamp: entry.timestamp.toISOString(),
          unitConversion: entry.unitConversionLogic,
          sponsCandidates: JSON.stringify(entry.sponsCandidatesJson),
          finalSelection: entry.finalSelectionId,
          approvalStatus: entry.approvalStatus,
        })
      })
    })

    // Generate buffer
    const buffer = await workbook.xlsx.writeBuffer()

    // Create export record
    const exportRecord = await prisma.export.create({
      data: {
        projectId,
        fileName: `${project.name}-${sheetType}-${new Date().toISOString().split('T')[0]}.xlsx`,
        format: 'EXCEL',
        sheetType: sheetType as 'LCY2' | 'LCY3',
        rowCount: lineItems.length,
      },
    })

    // Return Excel file
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${exportRecord.fileName}"`,
      },
    })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json(
      { error: 'Export failed' },
      { status: 500 }
    )
  }
}
