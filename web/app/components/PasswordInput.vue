<script setup lang="ts">
// password field with a show/hide toggle; all other attributes (autocomplete, placeholder...) go to the input
defineOptions({ inheritAttrs: false })
const model = defineModel<string>({ default: '' })
const show = ref(false)
</script>

<template>
  <UInput v-bind="$attrs" v-model="model" :type="show ? 'text' : 'password'" class="w-full">
    <template #trailing>
      <UButton
        type="button"
        color="neutral"
        variant="link"
        size="sm"
        :icon="show ? 'i-lucide-eye-off' : 'i-lucide-eye'"
        :aria-label="show ? 'Hide password' : 'Show password'"
        :aria-pressed="show"
        @click="show = !show"
      />
    </template>
  </UInput>
</template>
