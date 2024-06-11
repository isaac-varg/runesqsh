import { Hono } from "hono";
import { PrismaClient } from "@prisma/client";
import { customAlphabet } from "nanoid";

const app = new Hono();
const prisma = new PrismaClient();

// list of characters nanoid can choose from
const characters = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const nanoid = customAlphabet(characters, 8);

// accept a long url and provide shorts
app.post("/shorten", async (c) => {
  const body = await c.req.json();
  const url = body.url;
  const shortCode = nanoid();
  const shortUrl = `${process.env.BASE_URL}/${shortCode}`;

  const newUrl = await prisma.uRL.create({
    data: {
      shortCode,
      shortUrl,
      longUrl: url,
    },
  });

  return c.json(newUrl);
});

// redirect from short url
app.get("/:shortCode", async (c) => {
  const { shortCode } = c.req.param();

  try {
    // attempt to match a short code to db entry
    const longUrl = await prisma.uRL.findUnique({
      where: {
        shortCode,
      },
    });

    // do stuff if the entry exist
    if (longUrl) {
      // increment visit counter
      await prisma.uRL.update({
        where: {
          id: longUrl.id,
        },
        data: {
          visits: { increment: 1 },
        },
      });

      // redirect
      return c.redirect(longUrl.longUrl);
    } else {
      c.json({ error: "Short URL code not found" });
    }
  } catch (error) {
    c.json({ error: "Failed to redirect" });
  }
});

export default {
	port: process.env.APP_PORT || 4555,
	fetch: app.fetch,
}
