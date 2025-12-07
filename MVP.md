# ModelArena MVP - Road to v1 Launch

**Created**: December 7, 2025
**Target**: Production-ready MVP with 6 initial comparisons

---

## Overview

This document tracks all tasks required to launch ModelArena v1. Tasks are organized by category and marked with status:
- `[ ]` Pending
- `[~]` In Progress
- `[x]` Complete

---

## 1. Database & Schema Updates

### 1.1 Add Model Brand Field
- [x] Add `brand` field to Model table (e.g., "Kling", "Runway", "Veo", "Sora")
- [x] Add `endpointT2V` field for text-to-video endpoints
- [x] Create migration (db:push)
- [x] Update seed.ts with brand values for all models
- [x] Update Models page to group by brand instead of API provider
- [x] Hide models with 0 videos on public Models page

**Brand mapping:**
| Model Name | Brand |
|------------|-------|
| Kling 2.5 Turbo Standard | Kling |
| Kling 2.5 Turbo Pro | Kling |
| Kling AI O1 | Kling |
| Runway Gen-4 Turbo | Runway |
| Veo 3.1 / 3.1 Fast / 3.1 Reference | Veo |
| Sora 2 / Sora 2 Pro | Sora |
| Hailuo 2.3 (all variants) | Hailuo |
| Wan 2.5 Preview | Wan |
| Seedance 1.0 Pro Fast | Seedance |
| Vidu Q2 (all variants) | Vidu |
| Luma Ray 2 / 2 Flash / 3 | Luma |
| Pika 2.2 / 2 Turbo / 2.5 | Pika |

### 1.2 Add Text-to-Video Models
- [x] Add T2V endpoints to seed.ts for models that support it
- [x] Update existing models to have both capabilities where applicable

**T2V Endpoints to add:**
| Model | T2V Endpoint |
|-------|--------------|
| Kling 2.5 Turbo Standard | `fal-ai/kling-video/v2.5-turbo/standard/text-to-video` |
| Kling 2.5 Turbo Pro | `fal-ai/kling-video/v2.5-turbo/pro/text-to-video` |
| Veo 3.1 | `fal-ai/veo3.1` |
| Veo 3.1 Fast | `fal-ai/veo3.1/fast` |
| Sora 2 | `fal-ai/sora-2/text-to-video` |
| Sora 2 Pro | `fal-ai/sora-2/text-to-video/pro` |
| Hailuo 2.3 Pro | `fal-ai/minimax/hailuo-02/pro/text-to-video` |
| Hailuo 2.3 Standard | `fal-ai/minimax/hailuo-02/standard/text-to-video` |
| Wan 2.5 Preview | `fal-ai/wan-25-preview/text-to-video` |
| Seedance 1.0 Pro Fast | `fal-ai/bytedance/seedance/v1/pro/fast/text-to-video` |
| Vidu Q2 | `fal-ai/vidu/q2/text-to-video` |
| Luma Ray 2 | `fal-ai/luma-dream-machine/ray-2` |
| Luma Ray 2 Flash | `fal-ai/luma-dream-machine/ray-2-flash` |
| Pika 2.2 | `fal-ai/pika/v2.2/text-to-video` |

**Models WITHOUT T2V support:**
- Kling O1 (I2V only)
- Luma Ray 3 (manual only)
- Pika 2.5 (manual only)
- Veo 3.1 Reference (reference-to-video only)
- Vidu Q2 Reference (reference-to-video only)

---

## 2. Frontend Updates

### 2.1 Global Design
- [x] Enforce light theme only (remove dark mode CSS variables)
- [x] Ensure mobile responsive across all pages
- [x] Clean, modern design audit

### 2.2 Homepage
- [x] Update headline to "Compare AI Video Generation Models" (already done)
- [x] Review and polish hero section

### 2.3 Comparison Detail Page (Major Redesign) ✅ COMPLETED
- [x] Add left sidebar layout with:
  - [x] Source image (for I2V)
  - [x] Generation type badge
  - [x] Number of models compared
  - [x] Full prompt text
- [x] Sidebar behavior:
  - [x] Desktop: Fixed sidebar on left
  - [x] Mobile: Collapsible accordion above content (open by default)
- [x] Main content area:
  - [x] Large "Play All" button (prominent, rounded)
  - [x] Video grid: 3 per row on desktop
  - [x] **Default sort by votes (descending)**
  - [x] Sorting dropdown with options:
    - [x] Most Voted (default)
    - [x] Cheapest / Most Expensive
    - [x] Fastest / Slowest (generation time)
    - [x] Alphabetical (A-Z / Z-A)
- [x] Video card updates:
  - [x] Video player
  - [x] Model name
  - [x] API provider (fal.ai, Runway, Manual)
  - [x] Generation time
  - [x] Generation cost
  - [x] Thumbs up vote button (hide count if 0)

### 2.4 Comparisons Browse Page ✅ COMPLETED
- [x] **Default sort by total votes (descending)**
- [x] Add sorting dropdown (votes, newest, oldest)
- [x] Show total votes on comparison cards

### 2.5 Models Page ✅ COMPLETED
- [x] Group by **brand** (Kling, Runway, Veo) not API provider
- [x] Hide models with 0 generated videos on public page
- [x] Keep all models visible in admin model selector

### 2.6 Analytics Page ✅ COMPLETED
- [x] Add "Average Cost per Model" chart
- [x] Fix "Average Video Duration by Model" chart

### 2.7 Generation UI (Admin) ✅ COMPLETED
- [x] Make aspect ratio selector more prominent
- [x] Default video duration to 5 seconds where supported
- [x] Ensure duration options are clear

---

## 3. Comparisons Content

### 3.1 Image-to-Video Comparisons (3 total)

Each comparison needs:
- Source image (high quality, interesting subject)
- Detailed motion prompt
- Run across all I2V-capable models

#### Comparison I2V-1: Product/Commercial Use Case
**Target audience**: Brands, advertisers, e-commerce

**Source Image Description**:
A sleek, modern smartwatch displayed on a minimalist white marble surface. The watch face shows a colorful gradient screen. Soft studio lighting creates subtle reflections. Clean product photography style, 4K quality. Aspect ratio 16:9 or 1:1.

**Prompt**:
"The smartwatch screen gently pulses with an animated gradient, transitioning through blue, purple, and pink hues. Soft light reflections dance across the polished metal case. The camera slowly pushes in, revealing intricate details of the watch face. Subtle dust particles float through the beam of studio light. Premium product commercial feel."

---

#### Comparison I2V-2: Social Media/Viral Content
**Target audience**: Content creators, social media managers

**Source Image Description**:
A golden retriever puppy sitting in a field of sunflowers at golden hour. The puppy looks directly at the camera with a happy expression, tongue slightly out. Warm, dreamy lighting with bokeh background. Vertical 9:16 aspect ratio ideal for TikTok/Reels.

**Prompt**:
"The puppy's ears perk up with excitement, tail wagging energetically. A gentle breeze rustles the sunflowers around it. The puppy tilts its head curiously, then breaks into a joyful run toward the camera. Golden hour sunlight creates a magical, glowing atmosphere. Cinematic slow motion moments."

---

#### Comparison I2V-3: Cinematic/Film Production
**Target audience**: Filmmakers, production studios

**Source Image Description**:
A lone astronaut standing on the surface of Mars, looking out at a dramatic rust-red canyon landscape. Earth visible as a small blue dot in the pinkish sky. Epic scale, cinematic composition. The astronaut's visor reflects the alien landscape. 21:9 or 16:9 cinematic aspect ratio.

**Prompt**:
"The astronaut slowly turns their head, visor catching the distant sun's reflection. Martian dust swirls gently around their boots. They take a deliberate step forward toward the canyon edge. The camera pulls back dramatically to reveal the vast, desolate beauty of the Martian landscape. Atmospheric haze adds depth. Epic orchestral mood."

---

### 3.2 Text-to-Video Comparisons (3 total)

#### Comparison T2V-1: Product/Advertising
**Target audience**: Brands, marketing teams

**Prompt**:
"A crystal perfume bottle slowly rotates on a mirrored surface, surrounded by floating rose petals and golden light particles. Luxurious liquid swirls inside the bottle with an ethereal glow. Soft bokeh lights twinkle in the dark background. High-end beauty commercial aesthetic. Smooth, elegant camera movement. 4K cinematic quality."

---

#### Comparison T2V-2: Social Media/Entertainment
**Target audience**: Content creators, influencers

**Prompt**:
"A steaming cup of coffee sits on a cozy window sill during a rainy day. Raindrops streak down the window glass, blurring city lights outside. Steam rises gracefully from the cup, catching soft warm light. A hand reaches in and wraps around the mug. Hygge aesthetic, ASMR vibes, intimate and calming mood. Vertical format."

---

#### Comparison T2V-3: Cinematic/Storytelling
**Target audience**: Filmmakers, creative professionals

**Prompt**:
"A massive ancient dragon emerges from storm clouds above a medieval castle. Lightning illuminates its scales in flashes of electric blue. The dragon spreads its enormous wings, creating powerful gusts that bend the trees below. Castle torches flicker wildly. Cinematic wide shot, epic fantasy blockbuster style. Dramatic, awe-inspiring atmosphere."

---

## 4. Model Testing & Pricing

### 4.1 Manual Testing Required
Test each model for:
- Successful generation
- Output quality
- Actual generation time
- Any API changes or issues

**Models to test:**
- [ ] Veo 3.1 (all variants)
- [ ] Sora 2 (all variants)
- [ ] Hailuo 2.3 (all variants)
- [ ] Wan 2.5 Preview
- [ ] Seedance 1.0 Pro Fast
- [ ] Vidu Q2 (all variants)
- [ ] Luma Ray 2 (all variants)
- [ ] Pika 2.x (all variants)
- [ ] Kling (all variants)
- [ ] Runway Gen-4 Turbo

### 4.2 Pricing Review
- [ ] Verify all pricing configs in seed.ts against current fal.ai pricing
- [ ] Update any estimated prices with actual values
- [ ] Document any pricing changes

---

## 5. Pre-Launch Checklist

### 5.1 Technical
- [ ] Run full test generation with all models
- [ ] Verify worker process stability
- [ ] Test R2 upload/download
- [ ] Verify thumbnail generation
- [ ] Test voting system
- [ ] Check mobile responsiveness on real devices

### 5.2 Content
- [ ] Create all 6 comparisons
- [ ] Mark successful comparisons as public
- [ ] Feature best comparisons on homepage
- [ ] Add relevant tags

### 5.3 Environment
- [ ] All env vars configured for production
- [ ] Database migrated and seeded
- [ ] Worker process running
- [ ] Health check passing
- [ ] SSL configured

---

## Task Summary

| Category | Pending | In Progress | Complete |
|----------|---------|-------------|----------|
| Database | 0 | 0 | 8 |
| Frontend | 0 | 0 | 31 |
| Content | 6 | 0 | 0 |
| Testing | 13 | 0 | 0 |
| Pre-Launch | 15 | 0 | 0 |
| **Total** | **34** | **0** | **39** |

---

## Notes & Decisions

1. **Brand vs Provider**: Adding `brand` field to distinguish model maker (Kling, Veo) from API provider (fal.ai, Runway API)

2. **T2V Strategy**: Most models support T2V via fal.ai. Models without T2V: Kling O1, Luma Ray 3, Pika 2.5, Reference-to-video variants

3. **Sorting**: Default to votes descending everywhere. This surfaces best content first.

4. **Mobile sidebar**: Collapsible accordion stacked above content, open by default

5. **Light theme only**: Removing dark mode complexity for MVP

6. **Duration default**: 5 seconds to minimize cost and generation time during testing

7. **Admin flexibility**: Admin can still see/select all models regardless of video count
