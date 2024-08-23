const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Path to the shared reviews.json file in the backend folder
const filePath = path.join(__dirname, '../backend/reviews.json');

const scrape = async () => {
  const browser = await puppeteer.launch({ headless: true });  // Set to false if you want to see browser actions
  const page = await browser.newPage();

  // Navigate to the RateMyProfessors homepage
  await page.goto('https://www.ratemyprofessors.com/');

  // Handle cookie consent modal
  try {
    await page.waitForSelector('.CCPAModal__StyledCloseButton-sc-10x9kq-2', { timeout: 5000 });
    await page.click('.CCPAModal__StyledCloseButton-sc-10x9kq-2');
    console.log('Closed the cookie consent modal.');
  } catch (error) {
    console.log('No cookie consent modal found, or it took too long to appear.');
  }

  // Search for professor
  await page.waitForSelector('input[placeholder="Professor name"]');
  await page.type('input[placeholder="Professor name"]', 'John Otten');  // Modify as needed
  await page.keyboard.press('Enter');

  // Wait for the search results page
  await page.waitForNavigation();

  // Extract professor links
  const professorDetails = await page.evaluate(() => {
    const teacherCards = document.querySelectorAll('.TeacherCard__StyledTeacherCard-syjs0d-0');
    const targetProfessorName = 'John Otten';  // Modify as needed
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
        professor: 'John Otten',
        subject: 'Math',
        stars: 5,
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

  await browser.close();
};

scrape();
