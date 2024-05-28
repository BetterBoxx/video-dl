import http from "http";
import fs from "fs";
import path from "path";
import youtubedl from "youtube-dl-exec";

const server = http.createServer((req, res) => {
	// Assuming your downloads directory is './plugins/video-dl/downloads/'
	const downloadsDir = "./plugins/video-dl/downloads/";

	// Parse the request URL to get the filename
	const filename = path.basename(req.url);

	// Construct the full path of the requested file
	const filePath = path.join(downloadsDir, filename);

	// Check if the requested file exists
	fs.access(filePath, fs.constants.F_OK, (err) => {
		if (err) {
			res.statusCode = 404;
			res.end("File not found");
		} else {
			// Check if the filePath is a directory
			fs.stat(filePath, (err, stats) => {
				if (err) {
					console.error(err);
					res.statusCode = 500;
					res.end("Internal server error");
				} else {
					if (stats.isDirectory()) {
						res.statusCode = 400;
						res.end("Bad request: Cannot read a directory");
					} else {
						const contentType = filePath.endsWith(".mp4")
							? "video/mp4"
							: "application/octet-stream";
						res.setHeader("Content-Type", contentType);
						res.setHeader(
							"Content-Disposition",
							`attachment; filename="${filename}"`
						);
						const fileStream = fs.createReadStream(filePath);
						fileStream.pipe(res);
					}
				}
			});
		}
	});
});

// Start the server on port 3000 (you can change the port number if needed)
server.listen(process.env.PORT || 3000, () => {
	console.log("video-dl Server is running on port " + (process.env.PORT || 3000));
});

export function ytdl(msg) {
	if (msg.content.startsWith(process.env.YTDLP_PREFIX)) {
		const msgContent = msg.content.slice(process.env.YTDLP_PREFIX.length);
		// Screen URLs for site restriction
		if (
			!msgContent.startsWith("https://www.youtube.com/") &&
			!msgContent.startsWith("https://youtube.com/") &&
			!msgContent.startsWith("https://youtu.be/") &&
			!msgContent.startsWith("https://www.instagram.com/") &&
			!msgContent.startsWith("https://instagram.com/")
		) {
			return;
		}
		msg.reply(`${msg.sender.name}${process.env.YTDLP_PREP}`);
		const randomTitle = `video_${Date.now()}`;
		youtubedl(msgContent, {
			format: "[ext=mp4]",
			"format-sort": "res:480",
			output: `./plugins/video-dl/downloads/${randomTitle}.%(ext)s`,
			noCheckCertificates: true,
			noWarnings: true,
			addHeader: ["referer:youtube.com", "user-agent:googlebot"],
		})
			.then((output) => {
				msg.reply(
					`${msg.sender.name}${process.env.YTDLP_DONE}\n${
						process.env.YTDLP_URL
					}/${encodeURIComponent(randomTitle)}.mp4`
				);
			})
			.catch((error) => {
				msg.reply(msg.sender.name + process.env.YTDLP_ERROR);
			});
	}
}
