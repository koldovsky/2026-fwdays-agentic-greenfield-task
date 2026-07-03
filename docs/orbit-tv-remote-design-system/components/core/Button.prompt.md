Neumorphic button for primary/secondary/ghost actions, in sm/md/lg sizes.

```jsx
<Button variant="primary" icon="add">Add TV</Button>
<Button variant="secondary">Cancel</Button>
<Button variant="ghost" size="sm">Skip</Button>
```

Notable: `primary` uses the warm-orange gradient + tinted accent shadow — reserve for one CTA per screen. All variants invert to an inset shadow while pressed (mousedown), which is the core neumorphic "push" interaction.
