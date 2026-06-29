A book tile for the shelf / home grid. Generates a colored cover when no image is given.

```jsx
<BookCard
  title="The Human Condition"
  author="Hannah Arendt"
  cover="coral"
  rating={9}
  status="finished"
  tags={['philosophy', 're-read']}
  notes={24}
  onClick={openBook}
/>
```

`cover` picks a generated cover color; `coverSrc` overrides with an image. `status`: reading | finished | toread.
