import { ImageResponse } from "@vercel/og";
import { NextRequest } from "next/server";
import prisma from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get("type");
    const slug = searchParams.get("slug");

  // Model OG image
  if (type === "model" && slug) {
    const model = await prisma.model.findUnique({
      where: { slug },
      include: {
        provider: true,
        capabilities: true,
        _count: {
          select: {
            videos: { where: { status: "COMPLETED" } },
          },
        },
      },
    });

    if (model) {
      const capabilities = model.capabilities.slice(0, 3);
      return new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "center",
              backgroundColor: "#1a1a2e",
              padding: "80px",
            }}
          >
            <div
              style={{
                position: "absolute",
                top: "-100px",
                right: "-100px",
                width: "400px",
                height: "400px",
                borderRadius: "50%",
                background: "rgba(40, 162, 221, 0.1)",
                display: "flex",
              }}
            />

            <div
              style={{
                display: "flex",
                padding: "8px 20px",
                borderRadius: "20px",
                background: "rgba(255, 255, 255, 0.1)",
                color: "#9ca3af",
                fontSize: "20px",
                marginBottom: "24px",
              }}
            >
              via {model.provider.displayName}
            </div>

            <div
              style={{
                display: "flex",
                fontSize: model.name.length > 25 ? "56px" : "72px",
                fontWeight: 700,
                color: "white",
                marginBottom: "32px",
              }}
            >
              {model.name}
            </div>

            <div style={{ display: "flex", gap: "24px", marginBottom: "32px" }}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  padding: "16px 24px",
                  borderRadius: "16px",
                  background: "rgba(40, 162, 221, 0.15)",
                }}
              >
                <div style={{ display: "flex", fontSize: "36px", fontWeight: 700, color: "#28A2DD" }}>
                  {model._count.videos}
                </div>
                <div style={{ display: "flex", fontSize: "16px", color: "#9ca3af" }}>Videos</div>
              </div>
            </div>

            {capabilities.length > 0 && (
              <div style={{ display: "flex", gap: "12px" }}>
                {capabilities[0] && (
                  <div
                    style={{
                      display: "flex",
                      padding: "10px 20px",
                      borderRadius: "24px",
                      background: "rgba(40, 162, 221, 0.2)",
                      color: "#28A2DD",
                      fontSize: "18px",
                    }}
                  >
                    {capabilities[0].name}
                  </div>
                )}
                {capabilities[1] && (
                  <div
                    style={{
                      display: "flex",
                      padding: "10px 20px",
                      borderRadius: "24px",
                      background: "rgba(41, 176, 227, 0.2)",
                      color: "#29B0E3",
                      fontSize: "18px",
                    }}
                  >
                    {capabilities[1].name}
                  </div>
                )}
                {capabilities[2] && (
                  <div
                    style={{
                      display: "flex",
                      padding: "10px 20px",
                      borderRadius: "24px",
                      background: "rgba(41, 198, 233, 0.2)",
                      color: "#29C6E9",
                      fontSize: "18px",
                    }}
                  >
                    {capabilities[2].name}
                  </div>
                )}
              </div>
            )}

            <div
              style={{
                position: "absolute",
                bottom: "60px",
                left: "80px",
                display: "flex",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div style={{ display: "flex", width: "60px", height: "16px", borderRadius: "4px", background: "#28A2DD" }} />
                <div style={{ display: "flex", width: "42px", height: "16px", borderRadius: "4px", background: "#29B0E3" }} />
                <div style={{ display: "flex", width: "60px", height: "16px", borderRadius: "4px", background: "#29C6E9" }} />
              </div>
              <div style={{ display: "flex", fontSize: "28px", fontWeight: 700, color: "white" }}>
                ModelArena
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }
  }

  // Comparison OG image
  if (type === "comparison" && slug) {
    const comparison = await prisma.comparison.findUnique({
      where: { slug },
      include: {
        sourceImage: true,
        videos: {
          where: { status: "COMPLETED" },
          select: { id: true, thumbnailUrl: true },
          take: 4,
        },
      },
    });

    if (comparison) {
      // Get background image - prefer source image, then first video thumbnail
      const backgroundImage = comparison.sourceImage?.url || comparison.videos[0]?.thumbnailUrl;

      return new ImageResponse(
        (
          <div
            style={{
              height: "100%",
              width: "100%",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              justifyContent: "flex-end",
              backgroundColor: "#1a1a2e",
              padding: "60px 80px",
              position: "relative",
            }}
          >
            {/* Background image */}
            {backgroundImage && (
              <img
                src={backgroundImage}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                }}
              />
            )}

            {/* Subtle gradient overlay for text legibility */}
            <div
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                height: "100%",
                background: backgroundImage
                  ? "linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.3) 50%, transparent 100%)"
                  : "transparent",
                display: "flex",
              }}
            />

            {/* Content */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "flex-start",
                position: "relative",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "20px" }}>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    background:
                      comparison.type === "image-to-video"
                        ? "rgba(40, 162, 221, 0.9)"
                        : "rgba(41, 198, 233, 0.9)",
                    color: "white",
                    fontSize: "18px",
                    fontWeight: 600,
                  }}
                >
                  {comparison.type === "image-to-video" ? "Image to Video" : "Text to Video"}
                </div>
                <div
                  style={{
                    display: "flex",
                    padding: "8px 16px",
                    borderRadius: "20px",
                    background: "rgba(255, 255, 255, 0.2)",
                    color: "white",
                    fontSize: "18px",
                  }}
                >
                  {comparison.videos.length} models
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  fontSize: comparison.title.length > 50 ? "44px" : "52px",
                  fontWeight: 700,
                  color: "white",
                  maxWidth: "900px",
                  lineHeight: 1.2,
                  textShadow: "0 2px 10px rgba(0,0,0,0.5)",
                }}
              >
                {comparison.title.length > 80 ? comparison.title.slice(0, 80) + "..." : comparison.title}
              </div>
            </div>

            {/* Logo at bottom right */}
            <div
              style={{
                position: "absolute",
                bottom: "40px",
                right: "60px",
                display: "flex",
                alignItems: "center",
                gap: "16px",
                zIndex: 1,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div style={{ display: "flex", width: "40px", height: "10px", borderRadius: "3px", background: "#28A2DD" }} />
                <div style={{ display: "flex", width: "28px", height: "10px", borderRadius: "3px", background: "#29B0E3" }} />
                <div style={{ display: "flex", width: "40px", height: "10px", borderRadius: "3px", background: "#29C6E9" }} />
              </div>
              <div style={{ display: "flex", fontSize: "24px", fontWeight: 700, color: "white", textShadow: "0 2px 8px rgba(0,0,0,0.5)" }}>
                ModelArena
              </div>
            </div>
          </div>
        ),
        { width: 1200, height: 630 }
      );
    }
  }

  // Default OG image
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          backgroundColor: "#1a1a2e",
          padding: "80px",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-100px",
            right: "-100px",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(40, 162, 221, 0.1)",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-50px",
            left: "-50px",
            width: "300px",
            height: "300px",
            borderRadius: "50%",
            background: "rgba(41, 198, 233, 0.1)",
            display: "flex",
          }}
        />

        <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "40px" }}>
          <div style={{ display: "flex", width: "160px", height: "40px", borderRadius: "8px", background: "#28A2DD" }} />
          <div style={{ display: "flex", width: "112px", height: "40px", borderRadius: "8px", background: "#29B0E3" }} />
          <div style={{ display: "flex", width: "160px", height: "40px", borderRadius: "8px", background: "#29C6E9" }} />
        </div>

        <div style={{ display: "flex", fontSize: "72px", fontWeight: 700, color: "white", marginBottom: "16px" }}>
          ModelArena
        </div>

        <div style={{ display: "flex", fontSize: "32px", color: "#9ca3af", marginBottom: "40px" }}>
          Compare AI Video Generation Models
        </div>

        <div style={{ display: "flex", gap: "16px" }}>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: "24px",
              background: "rgba(40, 162, 221, 0.2)",
              color: "#28A2DD",
              fontSize: "18px",
            }}
          >
            Side-by-Side
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: "24px",
              background: "rgba(41, 176, 227, 0.2)",
              color: "#29B0E3",
              fontSize: "18px",
            }}
          >
            Real Results
          </div>
          <div
            style={{
              display: "flex",
              padding: "12px 24px",
              borderRadius: "24px",
              background: "rgba(41, 198, 233, 0.2)",
              color: "#29C6E9",
              fontSize: "18px",
            }}
          >
            Vote and Rank
          </div>
        </div>

        <div
          style={{
            position: "absolute",
            bottom: "40px",
            left: "80px",
            fontSize: "20px",
            color: "#6b7280",
            display: "flex",
          }}
        >
          modelarena.ai
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
  } catch (error) {
    console.error("OG Image generation error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to generate image", details: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
}
