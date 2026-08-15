import { afterEach, describe, expect, it, vi } from "vitest"
import { cleanup, render, screen, waitFor } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { FileDropzone } from "@/shared/components/file-upload/file-dropzone"

afterEach(cleanup)

const pick = async (file: File) => {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')
  if (!input) throw new Error("dropzone rendered no file input")
  await userEvent.upload(input, file)
}

const jpeg = () =>
  new File(["x".repeat(1024)], "photo.jpg", { type: "image/jpeg" })

describe("FileDropzone size limit", () => {
  /**
   * The admissions document cards pass the requirement's `maxBytes`, and the
   * API does not send it — so the prop arrives as 0. A default parameter does
   * not cover that (only `undefined` triggers it), so the 0 used to reach
   * react-dropzone and reject every file with no visible result at all.
   */
  it("accepts a file when the caller could not state a limit", async () => {
    const onFiles = vi.fn()
    const onReject = vi.fn()
    render(
      <FileDropzone maxSize={0} onFiles={onFiles} onReject={onReject} label="رفع" />
    )

    await pick(jpeg())

    await waitFor(() => expect(onFiles).toHaveBeenCalledTimes(1))
    expect(onReject).not.toHaveBeenCalled()
  })

  it("hides the size caption rather than advertising a 0 MB ceiling", () => {
    render(<FileDropzone maxSize={0} onFiles={vi.fn()} label="رفع" />)
    expect(screen.queryByText(/الحد الأقصى/)).not.toBeInTheDocument()
  })

  it("still enforces a real limit and reports the rejection", async () => {
    const onFiles = vi.fn()
    const onReject = vi.fn()
    render(
      <FileDropzone maxSize={512} onFiles={onFiles} onReject={onReject} label="رفع" />
    )

    await pick(jpeg())

    await waitFor(() => expect(onReject).toHaveBeenCalledTimes(1))
    expect(onFiles).not.toHaveBeenCalled()
    expect(screen.getByText(/الحد الأقصى 0 ميجابايت/)).toBeInTheDocument()
  })

  it("renders a rejection message where the user is looking", () => {
    render(
      <FileDropzone
        maxSize={0}
        onFiles={vi.fn()}
        error="حجم الملف يتجاوز الحد المسموح به."
        label="رفع"
      />
    )
    expect(screen.getByRole("alert")).toHaveTextContent(
      "حجم الملف يتجاوز الحد المسموح به."
    )
  })
})
