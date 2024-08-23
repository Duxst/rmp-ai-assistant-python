const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Path to the shared reviews.json file in the backend folder
const filePath = path.join(__dirname, '../backend/reviews.json');

const scrape = async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  console.log('Navigating to RateMyProfessors...');
  await page.goto('https://www.ratemyprofessors.com/');

  // Handle cookie consent modal
  try {
    await page.waitForSelector('.CCPAModal__StyledCloseButton-sc-10x9kq-2', { timeout: 5000 });
    await page.click('.CCPAModal__StyledCloseButton-sc-10x9kq-2');
    console.log('Closed the cookie consent modal.');
  } catch (error) {
    console.log('Cookie consent modal not found.');
  }
// Search for the professor
console.log('Waiting for search input...');
await page.waitForSelector('input[placeholder="Professor name"]', { timeout: 60000 });

console.log('Search input found, entering professor name...');
await page.type('input[placeholder="Professor name"]', 'John Otten'); // Modify professor name if needed
await page.keyboard.press('Enter');

// Wait for the search results page
console.log('Waiting for search results page to load...');
await page.waitForNavigation({ waitUntil: 'networkidle0' });

console.log('Extracting professor details...');
const professorDetails = await page.evaluate(() => {
  const teacherCards = document.querySelectorAll('.TeacherCard__StyledTeacherCard-syjs0d-0');
  const targetProfessorName = 'John Otten'; // Adjust as necessary
  const targetSchoolName = 'George Mason University';
  const professorLinks = [];

  for (let card of teacherCards) {
    const professorNameElement = card.querySelector('.CardName__StyledCardName-sc-1gyrgim-0');
    const schoolElement = card.querySelector('.CardSchool__School-sc-19lmz2k-1');

    if (
      professorNameElement && professorNameElement.textContent.trim() === targetProfessorName &&
      schoolElement && schoolElement.textContent.trim() === targetSchoolName
    ) {
      const href = card.getAttribute('href');
      if (href) {
        professorLinks.push(href);
      }
    }
  }
  return professorLinks;
});

if (professorDetails.length > 0) {
  for (const professorLink of professorDetails) {
    await page.goto(`https://www.ratemyprofessors.com${professorLink}`);
    console.log(`Navigated to the professor's page: ${professorLink}`);

    // Extract ratings
    const ratings = await page.evaluate(() => {
      const ratingContainers = document.querySelectorAll('.Rating__RatingInfo-sc-1rhvpxz-3.kEVEoU');
      const ratingsData = [];

      ratingContainers.forEach((container, index) => {
        const commentsElement = container.querySelector('.Comments__StyledComments-dzzyvm-0.gRjWel');
        const comments = commentsElement ? commentsElement.textContent.trim() : null;

        ratingsData.push({
          comment_number: index + 1,
          comments: comments
        });
      });

      return ratingsData;
    });

    // Prepare the review entry
    const professorReview = {
      professor: 'John Otten', // Adjust if needed
      subject: 'Math',         // Adjust if needed
      stars: 5,                // You can extract this dynamically if available
      review: ratings.map(rating => rating.comments).join(' ')
    };

    // Append to reviews.json
    let reviewsData = [];
    try {
      if (fs.existsSync(filePath)) {
        const fileData = fs.readFileSync(filePath);
        reviewsData = JSON.parse(fileData).reviews;
      }
    } catch (err) {
      console.error("Error reading reviews.json file:", err);
    }

    reviewsData.push(professorReview);

    fs.writeFileSync(filePath, JSON.stringify({ reviews: reviewsData }, null, 2));
    console.log(`Appended review to ${filePath}`);
  }
} else {
  console.log('No professor from George Mason University named John Otten found.');
}

// Close the browser
await browser.close();
};

scrape();