<script setup lang="ts">
defineProps<{
  modelValue: boolean;
  items: { text: string }[];
}>();

const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void;
  (e: 'click', value: string): void;
}>();
</script>

<template>
  <div class="menu">
    <Transition name="fade">
      <div
        v-show="modelValue"
        class="menu-modal"
        @click="emit('update:modelValue', false)"
      ></div>
    </Transition>
    <div v-show="modelValue" class="menu-content">
      <ul>
        <li
          v-for="(item, index) in items"
          :key="index"
          @click="
            emit('update:modelValue', false);
            emit('click', item.text);
          "
        >
          <span v-text="item.text"></span>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.menu-modal {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.2);
  z-index: 1;
}

.menu-content {
  top: 16px;
  position: absolute;
  background-color: white;
  z-index: 2;
  border-radius: 6px;
  right: -100%;
  min-width: 168px;
}

.menu-content li {
  padding: 10px;
  cursor: pointer;
  transition: background-color 0.2s;
}

.menu-content li:hover {
  background-color: rgba(0, 0, 0, 0.1);
}
</style>

