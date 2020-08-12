const MARKDOWN_CODE_MATCH = /```([^]+)```/

// copy from the code from the main site
const formatSchemas = (html: string) => {
  let schemaContent = html.match(MARKDOWN_CODE_MATCH)

  if (schemaContent) {
    let content = schemaContent[1]

    content = content
      .replace(/<\/br>-+<\/br>/g, '\n') // remove the ----- lines
      .replace(/<\/?br ?\/?>/g, '\n') // remove br and replace with newlines

    html = html.replace(MARKDOWN_CODE_MATCH, '```' + content + '```')
  }

  return html
}

export { formatSchemas }
