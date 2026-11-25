import React from 'react'
import fs from 'node:fs'
import path from 'node:path'
import { Document, Page, Image, View, Text, renderToFile } from '@react-pdf/renderer'

const PROJECT_DIR = process.cwd()
const ARTIFACT_DIR = '/home/chaitanya/.gemini/antigravity/brain/7f377de5-d4dc-47c0-8862-3df30752e641'
const SCREENSHOTS_DIR = path.join(PROJECT_DIR, 'screenshots')

function getPngDimensions(filePath) {
  const buf = fs.readFileSync(filePath)
  const width = buf.readUInt32BE(16)
  const height = buf.readUInt32BE(20)
  return { width, height }
}

const screens = [
  { id: '01', title: 'Home Page & Booking Search', laptop: '01_home_laptop.png', mobile: '01_home_mobile.png' },
  { id: '02', title: 'Bus Availability & Schedules', laptop: '02_availability_laptop.png', mobile: '02_availability_mobile.png' },
  { id: '03', title: 'Seat Selection Coach Map', laptop: '03_seats_laptop.png', mobile: '03_seats_mobile.png' },
  { id: '04', title: 'Passenger Details Form', laptop: '04_passengers_laptop.png', mobile: '04_passengers_mobile.png' },
  { id: '05', title: 'Booking Review Summary', laptop: '05_review_laptop.png', mobile: '05_review_mobile.png' },
  { id: '06', title: 'Payment & Wallet Pay', laptop: '06_payment_laptop.png', mobile: '06_payment_mobile.png' },
  { id: '07', title: 'Digital Boarding Pass (Route Ticket)', laptop: '07_ticket_pass_laptop.png', mobile: '07_ticket_pass_mobile.png' },
  { id: '08', title: 'Ticket Cancellation & Fair Refund', laptop: '08_cancellation_laptop.png', mobile: '08_cancellation_mobile.png' },
  { id: '09', title: 'User Account & Wallet Profile', laptop: '09_account_profile_laptop.png', mobile: '09_account_profile_mobile.png' },
  { id: '10', title: 'My Bookings Lookup', laptop: '10_my_bookings_laptop.png', mobile: '10_my_bookings_mobile.png' },
  { id: '11', title: 'Live Bus Tracking GPS', laptop: '11_live_tracking_laptop.png', mobile: '11_live_tracking_mobile.png' },
  { id: '12', title: 'Help Center & FAQs', laptop: '12_help_center_laptop.png', mobile: '12_help_center_mobile.png' },
  { id: '13', title: 'About Uday Travels', laptop: '13_about_us_laptop.png', mobile: '13_about_us_mobile.png' },
  { id: '14', title: 'Contact Us & Office Locations', laptop: '14_contact_us_laptop.png', mobile: '14_contact_us_mobile.png' },
  { id: '15', title: 'Terms & Cancellation Policies', laptop: '15_policies_laptop.png', mobile: '15_policies_mobile.png' },
  { id: '16', title: 'Admin: Daily Route & Bus Scheduler', laptop: '16_admin_scheduler_laptop.png', mobile: '16_admin_scheduler_mobile.png' },
  { id: '17', title: 'Admin: Manual Counter Ticketing', laptop: '17_admin_counter_booking_laptop.png', mobile: '17_admin_counter_booking_mobile.png' },
  { id: '18', title: 'Admin: Passenger Manifest & PDF Export', laptop: '18_admin_manifest_dispatch_laptop.png', mobile: '18_admin_manifest_dispatch_mobile.png' },
  { id: '19', title: 'Admin: Ticket Lookup & Overrides', laptop: '19_admin_ticket_lookup_laptop.png', mobile: '19_admin_ticket_lookup_mobile.png' },
  { id: '20', title: 'Admin: Authority & Governance Scope', laptop: '20_admin_authority_scope_laptop.png', mobile: '20_admin_authority_scope_mobile.png' },
]

async function generateLaptopPdf() {
  console.log('Generating Uday_Travels_Laptop_Screenshots.pdf...')
  const pages = screens.map((s) => {
    const filePath = path.join(SCREENSHOTS_DIR, s.laptop)
    const dim = getPngDimensions(filePath)
    const pageWidth = 1440
    const headerHeight = 44
    const imgHeight = Math.round((dim.height / dim.width) * pageWidth)
    const pageHeight = imgHeight + headerHeight

    return React.createElement(
      Page,
      {
        key: s.id,
        size: [pageWidth, pageHeight],
        style: { backgroundColor: '#0f172a' },
      },
      React.createElement(
        View,
        {
          style: {
            height: headerHeight,
            backgroundColor: '#0f172a',
            borderBottomWidth: 2,
            borderBottomColor: '#d97706',
            paddingHorizontal: 28,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
        React.createElement(
          View,
          { style: { flexDirection: 'row', alignItems: 'center', gap: 12 } },
          React.createElement(
            Text,
            { style: { color: '#f59e0b', fontSize: 15, fontWeight: 'bold' } },
            `[${s.id} / 20]`
          ),
          React.createElement(
            Text,
            { style: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' } },
            s.title
          )
        ),
        React.createElement(
          Text,
          { style: { color: '#94a3b8', fontSize: 13 } },
          'UDAY TRAVELS • LAPTOP VIEW (1440 × 900)'
        )
      ),
      React.createElement(Image, {
        src: filePath,
        style: { width: pageWidth, height: imgHeight },
      })
    )
  })

  const doc = React.createElement(
    Document,
    {
      title: 'Uday Travels - Laptop Screenshots',
      author: 'Uday Travels',
      subject: 'Complete 20-Page Visual Audit (Laptop 1440x900 Retina)',
    },
    ...pages
  )

  const localFile = path.join(PROJECT_DIR, 'Uday_Travels_Laptop_Screenshots.pdf')
  const artifactFile = path.join(ARTIFACT_DIR, 'Uday_Travels_Laptop_Screenshots.pdf')

  await renderToFile(doc, localFile)
  fs.copyFileSync(localFile, artifactFile)
  console.log(`Saved Laptop PDF: ${localFile} and ${artifactFile}`)
}

async function generateMobilePdf() {
  console.log('Generating Uday_Travels_Mobile_Screenshots.pdf...')
  const pages = screens.map((s) => {
    const filePath = path.join(SCREENSHOTS_DIR, s.mobile)
    const dim = getPngDimensions(filePath)
    const pageWidth = 420
    const headerHeight = 36
    const imgHeight = Math.round((dim.height / dim.width) * pageWidth)
    const pageHeight = imgHeight + headerHeight

    return React.createElement(
      Page,
      {
        key: s.id,
        size: [pageWidth, pageHeight],
        style: { backgroundColor: '#0f172a' },
      },
      React.createElement(
        View,
        {
          style: {
            height: headerHeight,
            backgroundColor: '#0f172a',
            borderBottomWidth: 1.5,
            borderBottomColor: '#d97706',
            paddingHorizontal: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
          },
        },
        React.createElement(
          View,
          { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
          React.createElement(
            Text,
            { style: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold' } },
            `[${s.id} / 20]`
          ),
          React.createElement(
            Text,
            { style: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' } },
            s.title.length > 28 ? s.title.slice(0, 26) + '...' : s.title
          )
        ),
        React.createElement(
          Text,
          { style: { color: '#94a3b8', fontSize: 9 } },
          'iPhone 14 (390×844)'
        )
      ),
      React.createElement(Image, {
        src: filePath,
        style: { width: pageWidth, height: imgHeight },
      })
    )
  })

  const doc = React.createElement(
    Document,
    {
      title: 'Uday Travels - Mobile Screenshots',
      author: 'Uday Travels',
      subject: 'Complete 20-Page Visual Audit (Mobile iPhone 14)',
    },
    ...pages
  )

  const localFile = path.join(PROJECT_DIR, 'Uday_Travels_Mobile_Screenshots.pdf')
  const artifactFile = path.join(ARTIFACT_DIR, 'Uday_Travels_Mobile_Screenshots.pdf')

  await renderToFile(doc, localFile)
  fs.copyFileSync(localFile, artifactFile)
  console.log(`Saved Mobile PDF: ${localFile} and ${artifactFile}`)
}

async function generateCombinedPdf() {
  console.log('Generating Uday_Travels_Combined_Screenshots.pdf...')
  const combinedPages = []

  for (const s of screens) {
    // 1. Laptop page
    const laptopPath = path.join(SCREENSHOTS_DIR, s.laptop)
    if (fs.existsSync(laptopPath)) {
      const dimL = getPngDimensions(laptopPath)
      const pageWidthL = 1440
      const headerHeightL = 44
      const imgHeightL = Math.round((dimL.height / dimL.width) * pageWidthL)
      const pageHeightL = imgHeightL + headerHeightL

      combinedPages.push(
        React.createElement(
          Page,
          {
            key: `${s.id}-laptop`,
            size: [pageWidthL, pageHeightL],
            style: { backgroundColor: '#0f172a' },
          },
          React.createElement(
            View,
            {
              style: {
                height: headerHeightL,
                backgroundColor: '#0f172a',
                borderBottomWidth: 2,
                borderBottomColor: '#d97706',
                paddingHorizontal: 28,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            },
            React.createElement(
              View,
              { style: { flexDirection: 'row', alignItems: 'center', gap: 12 } },
              React.createElement(
                Text,
                { style: { color: '#f59e0b', fontSize: 15, fontWeight: 'bold' } },
                `[${s.id} / 20]`
              ),
              React.createElement(
                Text,
                { style: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' } },
                `${s.title} (Laptop View)`
              )
            ),
            React.createElement(
              Text,
              { style: { color: '#94a3b8', fontSize: 13 } },
              'UDAY TRAVELS • LAPTOP (1440 × 900)'
            )
          ),
          React.createElement(Image, {
            src: laptopPath,
            style: { width: pageWidthL, height: imgHeightL },
          })
        )
      )
    }

    // 2. Mobile page
    const mobilePath = path.join(SCREENSHOTS_DIR, s.mobile)
    if (fs.existsSync(mobilePath)) {
      const dimM = getPngDimensions(mobilePath)
      const pageWidthM = 420
      const headerHeightM = 36
      const imgHeightM = Math.round((dimM.height / dimM.width) * pageWidthM)
      const pageHeightM = imgHeightM + headerHeightM

      combinedPages.push(
        React.createElement(
          Page,
          {
            key: `${s.id}-mobile`,
            size: [pageWidthM, pageHeightM],
            style: { backgroundColor: '#0f172a' },
          },
          React.createElement(
            View,
            {
              style: {
                height: headerHeightM,
                backgroundColor: '#0f172a',
                borderBottomWidth: 1.5,
                borderBottomColor: '#d97706',
                paddingHorizontal: 14,
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'space-between',
              },
            },
            React.createElement(
              View,
              { style: { flexDirection: 'row', alignItems: 'center', gap: 6 } },
              React.createElement(
                Text,
                { style: { color: '#f59e0b', fontSize: 11, fontWeight: 'bold' } },
                `[${s.id} / 20]`
              ),
              React.createElement(
                Text,
                { style: { color: '#ffffff', fontSize: 11, fontWeight: 'bold' } },
                s.title.length > 25 ? s.title.slice(0, 23) + '... (Mobile)' : `${s.title} (Mobile)`
              )
            ),
            React.createElement(
              Text,
              { style: { color: '#94a3b8', fontSize: 9 } },
              'iPhone 14 (390×844)'
            )
          ),
          React.createElement(Image, {
            src: mobilePath,
            style: { width: pageWidthM, height: imgHeightM },
          })
        )
      )
    }
  }

  const doc = React.createElement(
    Document,
    {
      title: 'Uday Travels - Mobile and Laptop Website Screenshots',
      author: 'Uday Travels',
      subject: 'Complete 20-Page Visual Audit in Mobile and Laptop Views',
    },
    ...combinedPages
  )

  const localFile = path.join(PROJECT_DIR, 'Uday_Travels_Combined_Screenshots.pdf')
  const artifactFile = path.join(ARTIFACT_DIR, 'Uday_Travels_Combined_Screenshots.pdf')

  await renderToFile(doc, localFile)
  fs.copyFileSync(localFile, artifactFile)
  console.log(`Saved Combined PDF: ${localFile} and ${artifactFile}`)
}

async function main() {
  await generateLaptopPdf()
  await generateMobilePdf()
  await generateCombinedPdf()
  console.log('All Screenshot PDFs generated successfully!')
}

main().catch((err) => {
  console.error('PDF Generation Failed:', err)
  process.exit(1)
})
