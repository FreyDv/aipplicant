/**
 * 🤘 Welcome to Stagehand!
 *
 * TO RUN THIS PROJECT:
 * ```
 * npm install
 * npm run start
 * ```
 *
 * To edit config, see `stagehand.config.ts`
 *
 */
import { Page, BrowserContext, Stagehand } from "@browserbasehq/stagehand";
import { z } from "zod";
import chalk from "chalk";
import dotenv from "dotenv";
import { actWithCache, drawObserveOverlay, clearOverlays } from "./utils.js";
import {act} from "@browserbasehq/stagehand/dist/lib/inference.js";

dotenv.config();

export async function main({
  page,
  context,
  stagehand,
}: {
  page: Page; // Playwright Page with act, extract, and observe methods
  context: BrowserContext; // Playwright BrowserContext
  stagehand: Stagehand; // Stagehand instance
}) {

const search =  {
  x: "https://www.linkedin.com/jobs/search/?currentJobId=4166592482&f_PP=100761630%2C101788145%2C101453867%2C104669182%2C100265826&f_WT=2%2C3&geoId=105149290&keywords=Typescript%20Javascript%20Node.js%20Nest.js%20Senior%20Software%20Engineer%20Back%20End%20Developer&sortBy=R"
}

  // Navigate to the page
  await page.goto(search.x);

  // await page.evaluate(() => {
  //   window.onscroll = () => { window.scrollTo(0, 0); };
  // });


  const email: string = process.env.EMAIL || "";
  const password: string =  process.env.PASSWORD || "";

  // You can pass a string directly to act
  const observedElements  =
      await page.observe({instruction: "Return fields email, password to login and button to click and process the login"
    ,onlyVisible: true});


  const loginElements = observedElements.filter(el=> {
    const email =    el.description.includes("email") || el.method == "fill";
    const password = el.description.includes("password") || el.method == "fill";
    const button =   el.description.toLocaleLowerCase().includes("Button") || el.method == "click";
    return email || password || button
  });

  for (const el of loginElements) {
    await page.act(`using ${el} made appropriate action to complete login with email: ${email} and password: ${password}`);
  }



  await page.screenshot({path:"./im.png"})

  //scrollable

  const items = await page.extract({
    instruction: `(Ignore header and right side of body) In left side of body Find all jobTitle and company name location, Remote or Hybrid -> (typeRH) and link to open in new tab`,
    schema: z.object({
      results: z.array(z.object({
        jobTitle: z.string(),
        companyName: z.string(),
        location: z.string(),
        typeRH: z.string(),
        link: z.string(),
      }))
    })
  });

  // You can use observe to plan an action before doing it
  const results = await page.observe(
    "Type 'Tell me in one sentence why I should use Stagehand' into the search box"
  );

  await drawObserveOverlay(page, results); // Highlight the search box
  await page.waitForTimeout(1000);
  await clearOverlays(page); // Remove the highlight before typing
  await page.act(results[0]);

  // You can also use the actWithCache function to speed up future workflows by skipping LLM calls!
  // Check out the utils.ts file to see how you can cache actions
  await actWithCache(page, "Click the suggestion to use AI");
  await page.waitForTimeout(2000);
  const { text } = await page.extract({
    instruction:
      "extract the text of the AI suggestion from the search results",
    schema: z.object({
      text: z.string(),
    }),
    useTextExtract: false, // Set this to true if you want to extract longer paragraphs
  });
  console.log(chalk.green("AI suggestion:"), text);
}
