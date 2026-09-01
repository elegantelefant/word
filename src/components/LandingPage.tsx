// ABOUTME: Shown when the app is opened in a browser rather than inside Word.
// ABOUTME: Explains what this is and how to install it, instead of a broken task pane.

export function LandingPage() {
  return (
    <div className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-12">
      <div className="text-center">
        <h1 className="text-xl font-semibold text-gray-800">Elefant for Word</h1>
        <p className="mt-1 text-sm text-gray-500">
          AI-powered legal document review, inside Microsoft Word.
        </p>
      </div>

      <div className="mt-8 rounded-lg border border-gray-200 bg-gray-50 p-4">
        <p className="text-sm text-gray-600">
          This page is the add-in itself &mdash; it needs to run inside Word to work.
          To install it:
        </p>

        <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-600">
          <li>
            <a href="/manifest.xml" download className="font-medium text-blue-600 hover:underline">
              Download manifest.xml
            </a>
          </li>
          <li>
            Open a document in{" "}
            <a href="https://word.new" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
              Word Online
            </a>
          </li>
          <li>
            Go to <strong>Home &rarr; Add-ins &rarr; Upload My Add-in</strong>, and select
            the file you downloaded
          </li>
        </ol>

        <p className="mt-3 text-xs text-gray-500">
          The Elefant panel then appears on the right side of your document.
        </p>
      </div>

      <div className="mt-4 text-center text-xs text-gray-500">
        Using desktop Word instead? Download the installer for{" "}
        <a href="/install-mac.command" download className="text-blue-600 hover:underline">
          macOS
        </a>{" "}
        or{" "}
        <a href="/install-windows.bat" download className="text-blue-600 hover:underline">
          Windows
        </a>
        .
      </div>
    </div>
  );
}
