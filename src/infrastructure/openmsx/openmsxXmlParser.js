class OpenMSXXmlParser {
  constructor() {
    this.buffer = "";
  }

  feed(data) {
    if (data) {
      this.buffer += data;
    }

    this.buffer = this.buffer
      .replace(/<openmsx-output>/g, "")
      .replace(/<\/openmsx-output>/g, "");

    const replies = [];
    const updates = [];

    while (true) {
      const match = this.buffer.match(/<reply[^>]*>([\s\S]*?)<\/reply>/);
      if (!match) break;

      const full = match[0];
      const result = match[1];

      replies.push(result);
      this.buffer = this.buffer.replace(full, "");
    }

    while (true) {
      const regex =
        /<update\s+type="status"\s+name="(?<eventId>\w+)"\s*>(?<eventContent>.*?)<\/update>/;
      const match = this.buffer.match(regex);
      if (!match) break;

      const full = match[0];
      const { eventId, eventContent } = match.groups;
      updates.push({ name: eventId, content: eventContent });

      this.buffer = this.buffer.replace(full, "");
    }

    if (this.buffer.length > 65536) {
      this.buffer = this.buffer.slice(-8192);
    }

    return { replies, updates };
  }
}

module.exports = OpenMSXXmlParser;
